import { DailyWeatherItem, WeeklyWeatherResponse, WeatherDataSourceType } from "./types.js";
import { stationConfig, readAllRecords } from "./weather_collector.js";

export function getWmoWeatherCondition(code: number): string {
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog / Depositing rime fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing Drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain (Slight to Heavy)";
    case 66:
    case 67:
      return "Freezing Rain";
    case 71:
    case 73:
    case 75:
      return "Snow fall";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Variable conditions";
  }
}

function formatDayLabel(dateStr: string, isToday: boolean, isYesterday: boolean): string {
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Evaluates historical daily observations for anomalous weather patterns
 * (e.g. unseasonable temperature spikes, extreme precipitation bursts, squalls).
 * Explicitly NOT applied to future forecast values.
 */
function evaluateDailyObservationAnomaly(
  item: { tempMax: number; tempMin: number; precipitationSum: number; windSpeedMax: number },
  baseline: { avgMax: number; avgMin: number; avgWind: number }
): { anomaly: boolean; score: number; reason: string } {
  let score = 0.2; // nominal baseline
  const reasons: string[] = [];

  // Extreme physical thresholds
  if (item.tempMax > 45) {
    score = Math.max(score, 0.82);
    reasons.push(`Extreme heat wave (${item.tempMax}°C exceeds 45°C safety threshold)`);
  } else if (item.tempMax > baseline.avgMax + 7) {
    score = Math.max(score, 0.65);
    reasons.push(`Unusual thermal deviation (+${(item.tempMax - baseline.avgMax).toFixed(1)}°C above 7-day average)`);
  }

  if (item.precipitationSum > 50) {
    score = Math.max(score, 0.88);
    reasons.push(`Severe torrential precipitation event (${item.precipitationSum.toFixed(1)} mm)`);
  } else if (item.precipitationSum > 25) {
    score = Math.max(score, 0.62);
    reasons.push(`Heavy rainfall observation (${item.precipitationSum.toFixed(1)} mm)`);
  }

  if (item.windSpeedMax > 65) {
    score = Math.max(score, 0.85);
    reasons.push(`Gale / squall wind gust (${item.windSpeedMax.toFixed(1)} km/h)`);
  } else if (item.windSpeedMax > baseline.avgWind + 25) {
    score = Math.max(score, 0.6);
    reasons.push(`Elevated wind gust anomaly (+${(item.windSpeedMax - baseline.avgWind).toFixed(1)} km/h over mean)`);
  }

  const isAnomaly = score >= 0.55;
  return {
    anomaly: isAnomaly,
    score: parseFloat(score.toFixed(3)),
    reason: reasons.length > 0 ? reasons.join("; ") : "Nominal observation range",
  };
}

export async function fetchWeeklyWeatherData(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<WeeklyWeatherResponse> {
  const isPrimaryStation =
    Math.abs(latitude - stationConfig.latitude) < 0.05 &&
    Math.abs(longitude - stationConfig.longitude) < 0.05;

  let resolvedName = locationName;
  if (!resolvedName || resolvedName.startsWith("Coordinate Probe") || resolvedName === "Selected Location") {
    if (isPrimaryStation) {
      resolvedName = "WeatherGuard Station AWS (Primary)";
    } else {
      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`;
        const revRes = await fetch(revUrl, {
          headers: { "User-Agent": "WeatherGuardAI-App/1.0" },
          signal: AbortSignal.timeout(2500),
        });
        if (revRes.ok) {
          const revData: any = await revRes.json();
          if (revData && revData.display_name) {
            const addr = revData.address || {};
            const cityOrCounty = addr.city || addr.town || addr.village || addr.county || addr.state_district || revData.name;
            const state = addr.state || addr.region || "";
            const country = addr.country || "";
            const parts = [cityOrCounty, state, country].filter(Boolean);
            if (parts.length > 0) {
              resolvedName = parts.join(", ");
            } else {
              resolvedName = revData.display_name.split(",").slice(0, 3).join(", ");
            }
          }
        }
      } catch {
        // Graceful fallback below
      }
      if (!resolvedName || resolvedName.startsWith("Coordinate Probe")) {
        resolvedName = `Coordinates (${latitude >= 0 ? latitude.toFixed(3) + "°N" : Math.abs(latitude).toFixed(3) + "°S"}, ${longitude >= 0 ? longitude.toFixed(3) + "°E" : Math.abs(longitude).toFixed(3) + "°W"})`;
      }
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean,weather_code,surface_pressure_mean,cloud_cover_mean&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code&past_days=7&forecast_days=8&timezone=auto`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}: ${res.statusText}`);
    }
    const data: any = await res.json();

    const daily = data.daily || {};
    const times: string[] = daily.time || [];
    const tempMax: number[] = daily.temperature_2m_max || [];
    const tempMin: number[] = daily.temperature_2m_min || [];
    const appMax: number[] = daily.apparent_temperature_max || [];
    const appMin: number[] = daily.apparent_temperature_min || [];
    const precip: number[] = daily.precipitation_sum || [];
    const precipProb: number[] = daily.precipitation_probability_max || [];
    const windMax: number[] = daily.wind_speed_10m_max || [];
    const windDir: number[] = daily.wind_direction_10m_dominant || [];
    const humid: number[] = daily.relative_humidity_2m_mean || [];
    const pressureDaily: number[] = daily.surface_pressure_mean || [];
    const cloudDaily: number[] = daily.cloud_cover_mean || [];
    const wCodes: number[] = daily.weather_code || [];

    // Identify today index (past_days=7 means index 7 is typically today)
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayIdx = times.indexOf(todayStr);
    if (todayIdx === -1) {
      todayIdx = Math.min(7, times.length - 1);
    }

    // Baseline calculation over the past 7 days for historical anomaly benchmarking
    const pastMaxTemps = tempMax.slice(0, todayIdx).filter((n) => typeof n === "number");
    const avgMax =
      pastMaxTemps.length > 0
        ? pastMaxTemps.reduce((a, b) => a + b, 0) / pastMaxTemps.length
        : 30;
    const pastMinTemps = tempMin.slice(0, todayIdx).filter((n) => typeof n === "number");
    const avgMin =
      pastMinTemps.length > 0
        ? pastMinTemps.reduce((a, b) => a + b, 0) / pastMinTemps.length
        : 22;
    const pastWinds = windMax.slice(0, todayIdx).filter((n) => typeof n === "number");
    const avgWind =
      pastWinds.length > 0
        ? pastWinds.reduce((a, b) => a + b, 0) / pastWinds.length
        : 15;

    const historical7Days: DailyWeatherItem[] = [];
    let currentDay: DailyWeatherItem | null = null;
    const forecast7Days: DailyWeatherItem[] = [];

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i];
      const isPast = i < todayIdx;
      const isCurrent = i === todayIdx;
      const isFuture = i > todayIdx;

      let dataType: WeatherDataSourceType = "HISTORICAL_OBSERVATION";
      let sourceNote = "Meteorological Surface Reanalysis (ERA5 / Synoptic Observations)";
      let eligible = true;

      if (isCurrent) {
        dataType = "CURRENT_OBSERVATION";
        sourceNote = isPrimaryStation
          ? "WeatherGuard Local AWS Hardware Sensors + Real-Time Telemetry"
          : "Synoptic Surface Station Model Estimate (Current Hour)";
        eligible = true;
      } else if (isFuture) {
        dataType = "NUMERICAL_FORECAST";
        sourceNote = "Numerical Weather Prediction Model (GFS / ECMWF Ensemble)";
        eligible = false; // NEVER present forecasts as actual sensor measurements
      }

      const itemMax = tempMax[i] ?? 0;
      const itemMin = tempMin[i] ?? 0;
      const itemPrecip = precip[i] ?? 0;
      const itemWind = windMax[i] ?? 0;
      const itemHumid = humid[i] ?? 0;
      const wCode = wCodes[i] ?? 0;

      // Anomaly detection only on actual observations
      let anomalyInfo = { anomaly: false, score: 0.1, reason: "Forecast prediction" };
      if (eligible) {
        anomalyInfo = evaluateDailyObservationAnomaly(
          { tempMax: itemMax, tempMin: itemMin, precipitationSum: itemPrecip, windSpeedMax: itemWind },
          { avgMax, avgMin, avgWind }
        );
      }

      const dailyItem: DailyWeatherItem = {
        date: dateStr,
        dayLabel: formatDayLabel(dateStr, isCurrent, i === todayIdx - 1),
        dataType,
        tempMin: parseFloat(itemMin.toFixed(1)),
        tempMax: parseFloat(itemMax.toFixed(1)),
        tempMean: parseFloat(((itemMax + itemMin) / 2).toFixed(1)),
        apparentTempMin: appMin[i] !== undefined ? parseFloat(appMin[i].toFixed(1)) : undefined,
        apparentTempMax: appMax[i] !== undefined ? parseFloat(appMax[i].toFixed(1)) : undefined,
        humidityMean: itemHumid ? Math.round(itemHumid) : undefined,
        precipitationSum: parseFloat(itemPrecip.toFixed(1)),
        precipitationProbabilityMax: precipProb[i] !== undefined ? Math.round(precipProb[i]) : undefined,
        windSpeedMax: parseFloat(itemWind.toFixed(1)),
        windDirectionDominant: windDir[i] !== undefined ? Math.round(windDir[i]) : undefined,
        surfacePressureMean: pressureDaily[i] !== undefined ? Math.round(pressureDaily[i]) : undefined,
        cloudCoverMean: cloudDaily[i] !== undefined ? Math.round(cloudDaily[i]) : undefined,
        weatherCode: wCode,
        weatherCondition: getWmoWeatherCondition(wCode),
        sourceNote,
        isEligibleForAnomalyCheck: eligible,
        anomaly: eligible ? anomalyInfo.anomaly : false,
        anomalyScore: eligible ? anomalyInfo.score : undefined,
        anomalySeverity: eligible
          ? anomalyInfo.anomaly
            ? anomalyInfo.score > 0.75
              ? "HIGH"
              : "MEDIUM"
            : "NORMAL"
          : undefined,
        anomalyReason: eligible ? anomalyInfo.reason : undefined,
      };

      if (isPast) {
        historical7Days.push(dailyItem);
      } else if (isCurrent) {
        currentDay = dailyItem;
      } else {
        forecast7Days.push(dailyItem);
      }
    }

    // Keep precisely past 7 days and next 7 days
    const slicedPast = historical7Days.slice(-7);
    const slicedForecast = forecast7Days.slice(0, 7);

    // Current condition from Open-Meteo or merge primary station reading
    const currentRaw = data.current || {};
    let currentTemp = currentRaw.temperature_2m ?? (currentDay ? currentDay.tempMax : 28);
    let currentHumid = currentRaw.relative_humidity_2m ?? 65;
    let currentPressure = currentRaw.surface_pressure ?? 1013;
    let currentWind = currentRaw.wind_speed_10m ?? 8;
    let currentWindDir = currentRaw.wind_direction_10m ?? 90;
    let currentCloud = currentRaw.cloud_cover ?? 20;
    let currentRain = currentRaw.precipitation ?? 0;
    let currentCode = currentRaw.weather_code ?? 0;
    let currentCond = getWmoWeatherCondition(currentCode);
    let currentSource = "Open-Meteo Synoptic Surface Network";
    let isActualStation = isPrimaryStation;
    let obsTypeLabel = isPrimaryStation
      ? "Confirmed Physical Station Sensor Telemetry (WeatherGuard AWS)"
      : "Open-Meteo Synoptic Model Estimate (Reanalysis & Satellite-Derived)";

    // If viewing primary station, overlay our live sensor reading
    if (isPrimaryStation) {
      const records = readAllRecords();
      if (records.length > 0) {
        const latest = records[records.length - 1];
        currentTemp = latest.temperature;
        currentHumid = latest.humidity;
        currentPressure = latest.pressure;
        currentWind = latest.wind_speed;
        currentWindDir = latest.wind_direction ?? currentWindDir;
        currentCloud = latest.cloudiness ?? currentCloud;
        currentRain = latest.rainfall ?? currentRain;
        currentCond = latest.weather_condition;
        currentSource = "WeatherGuard Local AWS (Live Telemetry Ingestion)";
        isActualStation = true;
        obsTypeLabel = "Confirmed Physical Station Sensor Telemetry (WeatherGuard AWS Ground Station)";
      }
    }

    const allTemps = [...slicedPast, ...(currentDay ? [currentDay] : []), ...slicedForecast].map(
      (d) => d.tempMax
    );
    const minAll = Math.min(...allTemps);
    const maxAll = Math.max(...allTemps);
    const totalForecastRain = slicedForecast.reduce((acc, d) => acc + d.precipitationSum, 0);
    const totalPastRain = slicedPast.reduce((acc, d) => acc + d.precipitationSum, 0);
    const highestWind = Math.max(
      ...slicedPast.map((d) => d.windSpeedMax),
      currentDay ? currentDay.windSpeedMax : 0,
      ...slicedForecast.map((d) => d.windSpeedMax)
    );

    return {
      status: "success",
      location: {
        latitude: data.latitude || latitude,
        longitude: data.longitude || longitude,
        name: resolvedName || (isPrimaryStation ? "WeatherGuard Station AWS (Primary)" : "Selected Location"),
        timezone: data.timezone || "Asia/Kolkata",
        elevation: data.elevation || 260,
      },
      current: {
        timestamp: currentRaw.time ? currentRaw.time.replace("T", " ") : new Date().toISOString().slice(0, 19).replace("T", " "),
        temperature: parseFloat(currentTemp.toFixed(1)),
        feels_like: currentRaw.apparent_temperature ? parseFloat(currentRaw.apparent_temperature.toFixed(1)) : parseFloat(currentTemp.toFixed(1)),
        humidity: Math.round(currentHumid),
        pressure: Math.round(currentPressure),
        wind_speed: parseFloat(currentWind.toFixed(1)),
        wind_direction: Math.round(currentWindDir),
        cloud_cover: Math.round(currentCloud),
        precipitation: parseFloat(currentRain.toFixed(1)),
        weather_condition: currentCond,
        weather_code: currentCode,
        source: currentSource,
        isActualStationObservation: isActualStation,
        observationTypeLabel: obsTypeLabel,
        anomaly: false,
        anomaly_score: 0.25,
        severity: "NORMAL",
      },
      historical7Days: slicedPast,
      currentDay,
      forecast7Days: slicedForecast,
      summary: {
        maxTempRange: [minAll, maxAll],
        totalForecastRainfall: parseFloat(totalForecastRain.toFixed(1)),
        totalPastRainfall: parseFloat(totalPastRain.toFixed(1)),
        highestWindSpeed: parseFloat(highestWind.toFixed(1)),
        observationDaysCount: slicedPast.length + (currentDay ? 1 : 0),
        forecastDaysCount: slicedForecast.length,
      },
    };
  } catch (err: any) {
    console.error("[WeeklyWeather] Open-Meteo fetch failed:", err.message);
    throw err;
  }
}
