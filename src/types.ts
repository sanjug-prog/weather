export interface WeatherRecord {
  timestamp: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  cloudiness: number;
  rainfall: number;
  visibility: number;
  weather_condition: string;
}

export type SeverityLevel = "NORMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AnomalyCategory =
  | "none"
  | "temperature anomaly"
  | "humidity anomaly"
  | "pressure anomaly"
  | "wind anomaly"
  | "rainfall anomaly"
  | "multiple sensor anomaly"
  | "sudden change"
  | "sensor anomaly";

export interface AnomalyResult {
  anomaly: boolean;
  anomaly_score: number;
  severity: SeverityLevel;
  anomaly_type: AnomalyCategory;
  parameter: string;
  current_value: string;
  expected_pattern: string;
  anomaly_reason: string;
}

export interface EnrichedWeatherRecord extends WeatherRecord, AnomalyResult {}

export interface SensorHealthMetric {
  col: string;
  unit: string;
  score: number;
  status: "Healthy" | "Warning" | "Needs attention";
  note: string;
}

export interface SensorHealthData {
  disclaimer: string;
  metrics: {
    temperature: SensorHealthMetric;
    humidity: SensorHealthMetric;
    pressure: SensorHealthMetric;
    wind: SensorHealthMetric;
    rainfall: SensorHealthMetric;
  };
}

export interface StationStatus {
  status: string;
  api_connected: boolean;
  api_status_code?: number | null;
  api_status_text: string;
  api_has_key?: boolean;
  api_key_masked?: string;
  activation_notice?: string | null;
  data_collection_active: boolean;
  collection_interval_sec: number;
  ml_model_status: string;
  total_records: number;
  station_coordinates: {
    latitude: number;
    longitude: number;
  };
  last_updated: string | null;
}

export type WeatherDataSourceType = "HISTORICAL_OBSERVATION" | "CURRENT_OBSERVATION" | "NUMERICAL_FORECAST";

export interface DailyWeatherItem {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Sep 15"
  dataType: WeatherDataSourceType;
  tempMin: number;
  tempMax: number;
  tempMean?: number;
  apparentTempMin?: number;
  apparentTempMax?: number;
  humidityMean?: number;
  precipitationSum: number; // mm
  precipitationProbabilityMax?: number; // % (available for forecasts)
  windSpeedMax: number; // km/h
  windDirectionDominant?: number; // degrees
  surfacePressureMean?: number; // hPa
  cloudCoverMean?: number; // %
  weatherCode: number;
  weatherCondition: string;
  sourceNote: string;
  isEligibleForAnomalyCheck: boolean;
  anomaly?: boolean;
  anomalyScore?: number;
  anomalySeverity?: SeverityLevel;
  anomalyReason?: string;
}

export interface WeeklyWeatherResponse {
  status: "success" | "error";
  message?: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    country?: string;
    timezone: string;
    elevation?: number;
  };
  current: {
    timestamp: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction?: number;
    cloud_cover?: number;
    precipitation?: number;
    weather_condition: string;
    weather_code: number;
    source: string;
    isActualStationObservation: boolean;
    observationTypeLabel: string;
    anomaly?: boolean;
    anomaly_score?: number;
    severity?: SeverityLevel;
    anomaly_reason?: string;
  } | null;
  historical7Days: DailyWeatherItem[];
  currentDay: DailyWeatherItem | null;
  forecast7Days: DailyWeatherItem[];
  summary: {
    maxTempRange: [number, number];
    totalForecastRainfall: number;
    totalPastRainfall: number;
    highestWindSpeed: number;
    observationDaysCount: number;
    forecastDaysCount: number;
  };
}

export type StationOperationalStatus = "NORMAL" | "WARNING" | "ANOMALY" | "OFFLINE";

export interface WeatherStationItem {
  id: string;
  name: string;
  code?: string;
  type: "AWS_PRIMARY" | "METAR_AIRPORT" | "WMO_SYNOPTIC" | "RESEARCH_STATION" | "VIRTUAL_PROBE";
  network: string;
  country: string;
  region?: string;
  coordinates: {
    latitude: number;
    longitude: number;
    elevationMeters?: number;
  };
  status: StationOperationalStatus;
  lastObservationTime: string | null;
  currentReading?: {
    temperature: number;
    feels_like?: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction?: number;
    rainfall?: number;
    cloudiness?: number;
    weather_condition: string;
    weather_code?: number;
  } | null;
  anomalyDetails?: {
    isAnomaly: boolean;
    score: number;
    category?: string;
    explanation?: string;
    spatialDeviationNote?: string;
  };
  dataSource: string;
  isPrimaryStation?: boolean;
}

export interface NearbyComparisonItem {
  station: WeatherStationItem;
  distanceKm: number;
  tempDiff: number;
  pressureDiff: number;
  humidityDiff: number;
  isConsistent: boolean;
  consistencyNote: string;
}
