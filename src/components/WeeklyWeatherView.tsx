import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Search,
  MapPin,
  RefreshCw,
  Info,
  Clock,
  ChevronRight,
  TrendingUp,
  CloudSun,
  Compass,
  Gauge,
  Cloud,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { WeeklyWeatherResponse, DailyWeatherItem } from "../types";
import { DashboardDataSource } from "../services/dashboardDataSource";

interface WeeklyWeatherViewProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocationName?: string;
  onOpenMap?: () => void;
}

export type WeeklyPeriodTab = "all" | "current" | "historical" | "forecast";

export function getCompassCardinal(deg?: number): string {
  if (deg === undefined || deg === null || isNaN(deg)) return "N/A";
  const cardinals = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return `${deg}° (${cardinals[idx]})`;
}

export const WeeklyWeatherView: React.FC<WeeklyWeatherViewProps> = ({
  initialLatitude = 11.2722,
  initialLongitude = 77.604,
  initialLocationName = "WeatherGuard Primary AWS (Erode / Tamil Nadu)",
  onOpenMap,
}) => {
  const [latitude, setLatitude] = useState<number>(initialLatitude);
  const [longitude, setLongitude] = useState<number>(initialLongitude);
  const [locationName, setLocationName] = useState<string>(initialLocationName);

  const [data, setData] = useState<WeeklyWeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "all", "current", "historical", "forecast"
  const [activeTab, setActiveTab] = useState<WeeklyPeriodTab>("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Selected date for deep inspection
  const [selectedDay, setSelectedDay] = useState<DailyWeatherItem | null>(null);

  // Active chart metric
  const [chartMetric, setChartMetric] = useState<"temperature" | "precipitation" | "wind" | "humidity">("temperature");

  // Human verification registry for historical anomaly review
  const [humanVerifications, setHumanVerifications] = useState<
    Record<string, { verified: boolean; verdict: "benign_event" | "sensor_fault"; verifiedAt: string }>
  >({});

  const loadWeeklyData = async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await DashboardDataSource.getWeeklyWeather(lat, lon, name);
      if (resp && resp.status === "success") {
        setData(resp);
        // Default selected day to current day or first historical day
        setSelectedDay(resp.currentDay || resp.forecast7Days[0] || null);
      } else {
        setError(resp?.message || "Failed to retrieve weekly weather telemetry.");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching weekly weather data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyData(latitude, longitude, locationName);
  }, [latitude, longitude]);

  // Sync if props change externally
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setLatitude(initialLatitude);
      setLongitude(initialLongitude);
      if (initialLocationName) setLocationName(initialLocationName);
    }
  }, [initialLatitude, initialLongitude, initialLocationName]);

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await DashboardDataSource.geocode(searchQuery.trim());
        setSearchResults(res || []);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc: { name: string; country: string; admin1?: string; latitude: number; longitude: number }) => {
    const label = `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}, ${loc.country}`;
    setLocationName(label);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Human verification action
  const handleVerifyAnomaly = (dateStr: string, verdict: "benign_event" | "sensor_fault") => {
    setHumanVerifications((prev) => ({
      ...prev,
      [dateStr]: {
        verified: true,
        verdict,
        verifiedAt: new Date().toLocaleTimeString(),
      },
    }));
  };

  // Prepare chart series filtered according to activeTab
  const chartData = useMemo(() => {
    if (!data) return [];
    const list: Array<{
      date: string;
      label: string;
      category: string;
      minTemp?: number;
      maxTemp?: number;
      precipitation?: number;
      precipProbability?: number;
      windSpeed?: number;
      humidity?: number;
      cloudCover?: number;
      surfacePressure?: number;
      isForecast: boolean;
      isCurrent: boolean;
    }> = [];

    // Historical 7 Days
    if (activeTab === "all" || activeTab === "historical") {
      data.historical7Days.forEach((d) => {
        list.push({
          date: d.date,
          label: d.dayLabel.split(",")[0],
          category: "Historical Observation",
          minTemp: d.tempMin,
          maxTemp: d.tempMax,
          precipitation: d.precipitationSum,
          precipProbability: undefined,
          windSpeed: d.windSpeedMax,
          humidity: d.humidityMean,
          cloudCover: d.cloudCoverMean,
          surfacePressure: d.surfacePressureMean,
          isForecast: false,
          isCurrent: false,
        });
      });
    }

    // Current Day
    if (data.currentDay && (activeTab === "all" || activeTab === "current")) {
      list.push({
        date: data.currentDay.date,
        label: "Today",
        category: "Current Observation",
        minTemp: data.currentDay.tempMin,
        maxTemp: data.currentDay.tempMax,
        precipitation: data.currentDay.precipitationSum,
        precipProbability: undefined,
        windSpeed: data.currentDay.windSpeedMax,
        humidity: data.currentDay.humidityMean,
        cloudCover: data.currentDay.cloudCoverMean,
        surfacePressure: data.currentDay.surfacePressureMean,
        isForecast: false,
        isCurrent: true,
      });
    }

    // Forecast 7 Days
    if (activeTab === "all" || activeTab === "forecast") {
      data.forecast7Days.forEach((d) => {
        list.push({
          date: d.date,
          label: d.dayLabel.split(",")[0],
          category: "Numerical Forecast",
          minTemp: d.tempMin,
          maxTemp: d.tempMax,
          precipitation: d.precipitationSum,
          precipProbability: d.precipitationProbabilityMax,
          windSpeed: d.windSpeedMax,
          humidity: d.humidityMean,
          cloudCover: d.cloudCoverMean,
          surfacePressure: d.surfacePressureMean,
          isForecast: true,
          isCurrent: false,
        });
      });
    }

    return list;
  }, [data, activeTab]);

  return (
    <div id="weekly-weather-section" className="space-y-6">
      {/* Top Location Bar & Worldwide Search */}
      <div id="weekly-header-bar" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Calendar className="w-3.5 h-3.5" />
                Worldwide Weather Explorer
              </span>
              <span className="text-xs text-slate-500">
                Historical Reanalysis • Live Conditions • Multi-Model Forecast
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{locationName}</span>
              <span className="text-xs font-normal text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                {data?.location.elevation ? ` • ${data.location.elevation}m elev` : ""}
              </span>
            </h2>
          </div>

          {/* Location Search Bar with Autocomplete */}
          <div className="relative w-full lg:w-96">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="location-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, town, or region worldwide..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              {isSearching && (
                <RefreshCw className="w-4 h-4 text-slate-400 absolute right-3 animate-spin" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div
                id="search-results-dropdown"
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto"
              >
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Global Geocoding Results
                </div>
                {searchResults.map((res, idx) => (
                  <button
                    key={`${res.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectLocation(res)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700 hover:text-blue-900 border-b border-slate-100 last:border-b-0 flex items-center justify-between group transition"
                  >
                    <div>
                      <span className="font-medium text-slate-900 group-hover:text-blue-700">
                        {res.name}
                      </span>
                      {res.admin1 && (
                        <span className="text-slate-500 text-xs ml-1">
                          ({res.admin1})
                        </span>
                      )}
                      <span className="text-slate-400 text-xs ml-1">
                        • {res.country}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Location Buttons featuring Karur, Tamil Nadu as primary example */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500">Quick Locations:</span>

          {/* Karur Featured Example Button */}
          <button
            type="button"
            id="example-karur-btn"
            onClick={() => {
              setLatitude(10.95771);
              setLongitude(78.08095);
              setLocationName("Karur, Tamil Nadu, India");
            }}
            className={`px-3 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
              Math.abs(latitude - 10.95771) < 0.05
                ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
            }`}
          >
            <span>★ Karur, Tamil Nadu (Example Location)</span>
          </button>

          {/* Primary Station AWS */}
          <button
            type="button"
            id="quick-primary-station"
            onClick={() => {
              setLatitude(11.2722);
              setLongitude(77.604);
              setLocationName("WeatherGuard Primary AWS (Erode / Tamil Nadu)");
            }}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              Math.abs(latitude - 11.2722) < 0.01
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            WeatherGuard Primary AWS
          </button>

          {/* Coimbatore */}
          <button
            type="button"
            onClick={() => {
              setLatitude(11.03);
              setLongitude(77.0434);
              setLocationName("Coimbatore Airport AWS, Tamil Nadu");
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            Coimbatore
          </button>

          {/* Salem */}
          <button
            type="button"
            onClick={() => {
              setLatitude(11.78);
              setLongitude(78.065);
              setLocationName("Salem IMD Station, Tamil Nadu");
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            Salem
          </button>

          {/* Chennai */}
          <button
            type="button"
            onClick={() => {
              setLatitude(13.0);
              setLongitude(80.18);
              setLocationName("Chennai Meenambakkam AWS, Tamil Nadu");
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            Chennai
          </button>

          {/* London */}
          <button
            type="button"
            onClick={() => {
              setLatitude(51.5074);
              setLongitude(-0.1278);
              setLocationName("London, United Kingdom");
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            London
          </button>

          {/* Tokyo */}
          <button
            type="button"
            onClick={() => {
              setLatitude(35.6762);
              setLongitude(139.6503);
              setLocationName("Tokyo, Japan");
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            Tokyo
          </button>

          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="ml-auto text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
            >
              Interactive World Map <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Period Navigation Tabs: Current Weather | Previous 7 Days | Next 7 Days | All 15 Days */}
      <div id="weekly-period-tabs" className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="tab-period-all"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All 15 Days (Timeline View)</span>
          </button>

          <button
            type="button"
            id="tab-period-current"
            onClick={() => setActiveTab("current")}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === "current"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Current Weather</span>
          </button>

          <button
            type="button"
            id="tab-period-historical"
            onClick={() => setActiveTab("historical")}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === "historical"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Previous 7 Days (Historical)</span>
            <span className="px-1.5 py-0.2 bg-blue-500/30 text-[10px] rounded text-white">7d</span>
          </button>

          <button
            type="button"
            id="tab-period-forecast"
            onClick={() => setActiveTab("forecast")}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === "forecast"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CloudSun className="w-4 h-4" />
            <span>Next 7 Days (Forecast)</span>
            <span className="px-1.5 py-0.2 bg-indigo-500/30 text-[10px] rounded text-white">7d</span>
          </button>
        </div>

        {/* Reload button */}
        <button
          type="button"
          onClick={() => loadWeeklyData(latitude, longitude, locationName)}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div id="weekly-loading-state" className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-700 font-medium text-base">
            Querying Meteorological APIs for {locationName}...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Loading historical surface observations (past 7 days), real-time conditions, and 7-day multi-model forecast
          </p>
        </div>
      )}

      {error && !loading && (
        <div id="weekly-error-state" className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-amber-900">Meteorological Telemetry Notice</h3>
              <p className="text-xs text-amber-700 mt-1">{error}</p>
              <button
                type="button"
                onClick={() => loadWeeklyData(latitude, longitude, locationName)}
                className="mt-3 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold"
              >
                Retry Request
              </button>
            </div>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Data Provenance & Methodological Distinction Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-blue-900">Data Provenance & Scientific Integrity: </span>
              {data.current?.isActualStationObservation ? (
                <span>
                  This location corresponds to <strong>WeatherGuard Primary Physical AWS</strong>. Current metrics reflect direct calibrated hardware sensor readings.
                </span>
              ) : (
                <span>
                  Current and historical readings for <strong>{locationName}</strong> are derived from{" "}
                  <strong>Open-Meteo Synoptic Surface Network & ERA5 Reanalysis</strong>. Upcoming 7-day values are produced by{" "}
                  <strong>Numerical Weather Prediction (GFS/ECMWF Multi-Model Ensemble)</strong>. Future forecast values are strictly labeled as model predictions and never classified as faulty sensor readings.
                </span>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION: CURRENT WEATHER                                 */}
          {/* ======================================================== */}
          {(activeTab === "all" || activeTab === "current") && data.current && (
            <div
              id="current-weather-dashboard-card"
              className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl shadow-md p-6 border border-slate-700 space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-700/80 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Current Weather Conditions
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        data.current.isActualStationObservation
                          ? "bg-emerald-800 text-emerald-100 border border-emerald-600"
                          : "bg-slate-700 text-slate-200 border border-slate-600"
                      }`}
                    >
                      {data.current.observationTypeLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4 mt-3">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                      {data.current.temperature.toFixed(1)}°C
                    </span>
                    <div className="text-sm text-slate-300">
                      <div>Feels like: <strong className="text-white">{data.current.feels_like.toFixed(1)}°C</strong></div>
                      <div className="text-xs text-slate-400">Timestamp: {data.current.timestamp} ({data.location.timezone})</div>
                    </div>
                    <span className="text-sm font-semibold text-blue-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 ml-auto">
                      {data.current.weather_condition}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 text-left md:text-right">
                  <div>Source: <span className="text-slate-200 font-semibold">{data.current.source}</span></div>
                  <div>Location: <span className="text-slate-200 font-semibold">{locationName}</span></div>
                  <div>Coordinates: <span className="font-mono text-slate-300">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</span></div>
                </div>
              </div>

              {/* Comprehensive 9-Point Current Conditions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Humidity */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Relative Humidity
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current.humidity}%
                  </div>
                  <div className="text-[10px] text-slate-400">Moisture content</div>
                </div>

                {/* 2. Rainfall / Precipitation */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Precipitation
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current.precipitation !== undefined ? `${data.current.precipitation} mm` : "0.0 mm"}
                  </div>
                  <div className="text-[10px] text-slate-400">Current surface rate</div>
                </div>

                {/* 3. Wind Speed */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-teal-400" /> Wind Velocity
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current.wind_speed.toFixed(1)} km/h
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {(data.current.wind_speed / 3.6).toFixed(1)} m/s
                  </div>
                </div>

                {/* 4. Wind Direction */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" /> Wind Direction
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {getCompassCardinal(data.current.wind_direction)}
                  </div>
                  <div className="text-[10px] text-slate-400">Dominant vector</div>
                </div>

                {/* 5. Atmospheric Pressure */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" /> Surface Pressure
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current.pressure} hPa
                  </div>
                  <div className="text-[10px] text-slate-400">Barometric sensor</div>
                </div>

                {/* 6. Cloud Cover */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-purple-400" /> Cloud Cover
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current.cloud_cover !== undefined ? `${data.current.cloud_cover}%` : "30%"}
                  </div>
                  <div className="text-[10px] text-slate-400">Sky opacity</div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* INTERACTIVE MULTI-METRIC CHART                           */}
          {/* ======================================================== */}
          <div id="weekly-trends-chart-card" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  {activeTab === "all" && "15-Day Comparative Meteorological Trends"}
                  {activeTab === "current" && "Current Observation vs Immediate Context"}
                  {activeTab === "historical" && "Previous 7 Days Historical Trend (Surface Observations)"}
                  {activeTab === "forecast" && "Next 7 Days Numerical Model Projections (GFS/ECMWF)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Interactive multi-parameter graph separating historical observations from numerical model projections
                </p>
              </div>

              {/* Metric Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  id="metric-btn-temp"
                  onClick={() => setChartMetric("temperature")}
                  className={`px-2.5 py-1 rounded transition ${
                    chartMetric === "temperature" ? "bg-white text-orange-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Temperature
                </button>
                <button
                  type="button"
                  id="metric-btn-rain"
                  onClick={() => setChartMetric("precipitation")}
                  className={`px-2.5 py-1 rounded transition ${
                    chartMetric === "precipitation" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Rainfall
                </button>
                <button
                  type="button"
                  id="metric-btn-wind"
                  onClick={() => setChartMetric("wind")}
                  className={`px-2.5 py-1 rounded transition ${
                    chartMetric === "wind" ? "bg-white text-teal-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Wind Speed
                </button>
                <button
                  type="button"
                  id="metric-btn-humid"
                  onClick={() => setChartMetric("humidity")}
                  className={`px-2.5 py-1 rounded transition ${
                    chartMetric === "humidity" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Humidity & Sky
                </button>
              </div>
            </div>

            {/* Visual Separation Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                <span>Historical Surface Observations (Verified)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-400 border border-dashed border-indigo-600 inline-block" />
                <span>Forecast Model Predictions (GFS/ECMWF)</span>
              </div>
              {activeTab === "all" && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Timeline Divider: Today</span>
                </div>
              )}
            </div>

            {/* Recharts Container */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1 z-50">
                            <div className="font-bold text-slate-100 flex items-center justify-between gap-3">
                              <span>{item.date} ({label})</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.isForecast
                                    ? "bg-indigo-600 text-white"
                                    : item.isCurrent
                                    ? "bg-emerald-600 text-white"
                                    : "bg-blue-600 text-white"
                                }`}
                              >
                                {item.isForecast ? "Forecast Prediction" : item.isCurrent ? "Today's Observation" : "Historical Observation"}
                              </span>
                            </div>
                            {chartMetric === "temperature" && (
                              <>
                                <div className="text-orange-400">Max Temp: {item.maxTemp}°C</div>
                                <div className="text-blue-300">Min Temp: {item.minTemp}°C</div>
                              </>
                            )}
                            {chartMetric === "precipitation" && (
                              <>
                                <div className="text-cyan-400">Precipitation: {item.precipitation} mm</div>
                                {item.precipProbability !== undefined && (
                                  <div className="text-indigo-300">Rain Probability: {item.precipProbability}%</div>
                                )}
                              </>
                            )}
                            {chartMetric === "wind" && (
                              <div className="text-teal-400">Wind Speed: {item.windSpeed} km/h ({(item.windSpeed / 3.6).toFixed(1)} m/s)</div>
                            )}
                            {chartMetric === "humidity" && (
                              <>
                                <div className="text-indigo-300">Relative Humidity: {item.humidity}%</div>
                                {item.cloudCover !== undefined && (
                                  <div className="text-purple-300">Cloud Cover: {item.cloudCover}%</div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {activeTab === "all" && (
                    <ReferenceLine x="Today" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: "TODAY", fill: "#ef4444", fontSize: 10, position: "top" }} />
                  )}

                  {chartMetric === "temperature" && (
                    <>
                      <Line type="monotone" dataKey="maxTemp" name="Max Temp (°C)" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="minTemp" name="Min Temp (°C)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                    </>
                  )}

                  {chartMetric === "precipitation" && (
                    <Bar dataKey="precipitation" name="Rainfall (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  )}

                  {chartMetric === "wind" && (
                    <Line type="monotone" dataKey="windSpeed" name="Max Wind Speed (km/h)" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}

                  {chartMetric === "humidity" && (
                    <>
                      <Line type="monotone" dataKey="humidity" name="Mean Humidity (%)" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="cloudCover" name="Cloud Cover (%)" stroke="#9333ea" strokeDasharray="3 3" strokeWidth={1.5} dot={{ r: 2 }} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION: PREVIOUS 7 DAYS & NEXT 7 DAYS CARD PANELS       */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------------------------------------------------- */}
            {/* PANEL 1: PREVIOUS 7 DAYS HISTORICAL OBSERVATIONS     */}
            {/* ---------------------------------------------------- */}
            {(activeTab === "all" || activeTab === "historical") && (
              <div id="historical-7days-panel" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${activeTab === "historical" ? "lg:col-span-2" : ""}`}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Previous 7 Days Historical Weather Data
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Surface observations & meteorological reanalysis (ERA5 / Synoptic)
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified Surface Observation
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  {data.historical7Days.map((day) => {
                    const isSelected = selectedDay?.date === day.date;
                    const humanReview = humanVerifications[day.date];
                    return (
                      <div
                        key={day.date}
                        className={`rounded-lg border transition ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-300 shadow-xs ring-1 ring-blue-400"
                            : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className="w-full text-left p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <div className="font-bold text-xs text-slate-800">{day.dayLabel}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{day.date}</div>
                            </div>
                            <div className="hidden sm:block text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {day.weatherCondition}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
                            <div className="text-right">
                              <span className="text-orange-600">{day.tempMax}°</span> /{" "}
                              <span className="text-blue-600">{day.tempMin}°C</span>
                            </div>
                            <div className="text-slate-500 hidden sm:block text-[11px]">
                              {day.precipitationSum} mm
                            </div>
                            <div className="text-slate-500 hidden md:block text-[11px]">
                              {day.humidityMean ? `${day.humidityMean}%` : ""}
                            </div>

                            {/* WeatherGuard Anomaly Evaluation Badge */}
                            {day.anomaly ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold flex items-center gap-1 border border-red-200">
                                <AlertTriangle className="w-3 h-3" /> Anomaly Flagged
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200/80 text-slate-700 font-medium">
                                Nominal
                              </span>
                            )}
                          </div>
                        </button>

                        {/* If anomaly detected, show verification controls */}
                        {day.anomaly && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 text-xs flex flex-wrap items-center justify-between gap-2">
                            <div className="text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{day.anomalyReason || "Statistical observation deviation"}</span>
                            </div>
                            {humanReview ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <UserCheck className="w-3 h-3" /> Human Verified ({humanReview.verdict === "benign_event" ? "Natural Weather Event" : "Hardware Defect"}) at {humanReview.verifiedAt}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyAnomaly(day.date, "benign_event");
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold"
                                >
                                  Verify as Natural Event
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyAnomaly(day.date, "sensor_fault");
                                  }}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold"
                                >
                                  Confirm Sensor Fault
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* PANEL 2: NEXT 7 DAYS FORECAST DATA                   */}
            {/* ---------------------------------------------------- */}
            {(activeTab === "all" || activeTab === "forecast") && (
              <div id="forecast-7days-panel" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${activeTab === "forecast" ? "lg:col-span-2" : ""}`}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      <CloudSun className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Next 7 Days Numerical Weather Forecast
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        NWP multi-model ensemble (GFS / ECMWF) • Predictive Projections
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Model Forecast (Not Sensor Data)
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  {data.forecast7Days.map((day) => {
                    const isSelected = selectedDay?.date === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-400"
                            : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <div className="font-bold text-xs text-slate-800">{day.dayLabel}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{day.date}</div>
                          </div>
                          <div className="hidden sm:block text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {day.weatherCondition}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
                          <div className="text-right">
                            <span className="text-orange-600">{day.tempMax}°</span> /{" "}
                            <span className="text-blue-600">{day.tempMin}°C</span>
                          </div>
                          <div className="text-slate-500 hidden sm:block text-[11px]">
                            {day.precipitationSum} mm rain
                          </div>
                          {day.precipitationProbabilityMax !== undefined && (
                            <div className="text-indigo-600 hidden md:block text-[11px] font-semibold">
                              {day.precipitationProbabilityMax}% pop
                            </div>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">
                            Forecast
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION: DEEP INSPECTION FOR SELECTED DATE               */}
          {/* ======================================================== */}
          {selectedDay && (
            <div
              id="day-detail-inspection-card"
              className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 bg-gradient-to-br from-white to-blue-50/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedDay.dataType === "NUMERICAL_FORECAST"
                          ? "bg-indigo-600 text-white"
                          : selectedDay.dataType === "CURRENT_OBSERVATION"
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {selectedDay.dataType.replace(/_/g, " ")}
                    </span>
                    <h4 className="font-bold text-base text-slate-900">
                      Detailed Inspection: {selectedDay.dayLabel} ({selectedDay.date})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Provenance Note: <span className="font-medium text-slate-700">{selectedDay.sourceNote}</span>
                  </p>
                </div>

                {selectedDay.dataType !== "NUMERICAL_FORECAST" && (
                  <div className="flex items-center gap-2">
                    {selectedDay.anomaly ? (
                      <div className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Anomaly Flagged (Anomaly Score: {selectedDay.anomalyScore})
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Nominal Physical Range Verified
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Day Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
                {/* Temp */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-500" /> Max / Min Temp
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {selectedDay.tempMax}°C / {selectedDay.tempMin}°C
                  </div>
                  {selectedDay.apparentTempMax && (
                    <div className="text-[11px] text-slate-500">
                      Feels max: {selectedDay.apparentTempMax}°C
                    </div>
                  )}
                </div>

                {/* Rainfall */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-blue-500" /> Rainfall Total
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {selectedDay.precipitationSum} mm
                  </div>
                  {selectedDay.precipitationProbabilityMax !== undefined && (
                    <div className="text-[11px] text-indigo-600 font-medium">
                      {selectedDay.precipitationProbabilityMax}% precip chance
                    </div>
                  )}
                </div>

                {/* Wind */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-teal-500" /> Max Wind Speed
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {selectedDay.windSpeedMax} km/h
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(selectedDay.windSpeedMax / 3.6).toFixed(1)} m/s
                  </div>
                </div>

                {/* Wind Direction */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" /> Wind Direction
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {getCompassCardinal(selectedDay.windDirectionDominant)}
                  </div>
                  <div className="text-[11px] text-slate-500">Dominant heading</div>
                </div>

                {/* Pressure */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-amber-500" /> Mean Pressure
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {selectedDay.surfacePressureMean ? `${selectedDay.surfacePressureMean} hPa` : "1012 hPa"}
                  </div>
                  <div className="text-[11px] text-slate-500">Surface level</div>
                </div>

                {/* Humidity & Cloud */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Humidity / Sky
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {selectedDay.humidityMean ? `${selectedDay.humidityMean}%` : "N/A"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedDay.cloudCoverMean !== undefined ? `${selectedDay.cloudCoverMean}% cloud` : selectedDay.weatherCondition}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
