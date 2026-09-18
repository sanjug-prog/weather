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
