import {
  StationStatus,
  EnrichedWeatherRecord,
  SensorHealthData,
  WeeklyWeatherResponse,
  WeatherStationItem,
  NearbyComparisonItem,
} from "../types";
import { clientWeatherEngine } from "./clientWeatherEngine";

// Tracks whether the backend API is live or if we are using the in-browser engine
let backendAvailable: boolean | null = null;

async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      return null;
    }
    const data = await res.json();
    backendAvailable = true;
    return data;
  } catch (e) {
    backendAvailable = false;
    return null;
  }
}

export const DashboardDataSource = {
  async getStatus(): Promise<StationStatus> {
    const data = await safeFetchJson<StationStatus>("/api/status");
    if (data && data.status) {
      return data;
    }
    return clientWeatherEngine.getStatus();
  },

  async getCurrentReading(): Promise<EnrichedWeatherRecord | null> {
    const data = await safeFetchJson<{ status: string; reading: EnrichedWeatherRecord }>("/api/current");
    if (data && data.reading) {
      return data.reading;
    }
    return clientWeatherEngine.getCurrentReading();
  },

  async getHistory(limit: number = 30): Promise<EnrichedWeatherRecord[]> {
    const data = await safeFetchJson<{ status: string; records: EnrichedWeatherRecord[] }>(`/api/history?limit=${limit}`);
    if (data && Array.isArray(data.records)) {
      return data.records;
    }
    return clientWeatherEngine.getHistory(limit);
  },

  async getAnomalies(): Promise<EnrichedWeatherRecord[]> {
    const data = await safeFetchJson<{ status: string; anomalies: EnrichedWeatherRecord[] }>("/api/anomalies");
    if (data && Array.isArray(data.anomalies)) {
      return data.anomalies;
    }
    return clientWeatherEngine.getAnomalies();
  },

  async getSensorHealth(): Promise<SensorHealthData> {
    const data = await safeFetchJson<{ status: string; sensor_health: SensorHealthData }>("/api/health");
    if (data && data.sensor_health) {
      return data.sensor_health;
    }
    return clientWeatherEngine.getSensorHealth();
  },

  async collectObservation(): Promise<{ message: string; isClientMode?: boolean }> {
    const data = await safeFetchJson<{ status: string; message: string }>("/api/collect", {
      method: "POST",
    });
    if (data && data.message) {
      return { message: data.message };
    }
    const result = await clientWeatherEngine.collectObservation();
    return { message: result.message, isClientMode: true };
  },

  async simulateAnomaly(type: string, customValue?: number): Promise<{ message: string }> {
    const data = await safeFetchJson<{ status: string; message: string }>("/api/simulate-anomaly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, customValue }),
    });
    if (data && data.message) {
      return { message: data.message };
    }
    clientWeatherEngine.simulateAnomaly(type, customValue);
    return { message: `Simulated anomaly (${type}) added. Anomaly detector evaluated!` };
  },

  async saveConfig(cfg: {
    apiKey?: string;
    latitude?: number;
    longitude?: number;
    collectionIntervalSec?: number;
  }): Promise<void> {
    const data = await safeFetchJson<{ status: string; message: string }>("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!data) {
      clientWeatherEngine.saveConfig(cfg);
    }
  },

  async getRawCsv(): Promise<string> {
    try {
      const res = await fetch("/api/raw-csv");
      if (res.ok) {
        const text = await res.text();
        // Ensure it looks like CSV, not an HTML 404 page
        if (text.includes("timestamp,latitude") || text.includes("timestamp,")) {
          return text;
        }
      }
    } catch {
      // ignore
    }
    return clientWeatherEngine.getRawCsv();
  },

  async resetCsv(): Promise<void> {
    const data = await safeFetchJson<{ status: string }>("/api/reset-csv", { method: "POST" });
    if (!data) {
      clientWeatherEngine.resetCsv();
    }
  },

  async verifyKey(apiKey?: string, latitude?: number, longitude?: number): Promise<{ valid: boolean; status: number; message: string }> {
    const data = await safeFetchJson<{ valid: boolean; status: number; message: string }>("/api/verify-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, latitude, longitude }),
    });
    if (data) {
      return data;
    }

    // Direct client verification if running in static mode
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        valid: false,
        status: 400,
        message: "No API key provided. Using built-in simulated weather observations.",
      };
    }

    try {
      const lat = latitude || 11.2722;
      const lon = longitude || 77.6040;
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey.trim()}&units=metric`);
      if (res.ok) {
        return {
          valid: true,
          status: 200,
          message: "API key is valid and connected to live OpenWeather data.",
        };
      } else if (res.status === 401) {
        return {
          valid: false,
          status: 401,
          message: "Key is not yet active on OpenWeather servers (HTTP 401). New keys take 15–60 minutes to propagate.",
        };
      } else {
        return {
          valid: false,
          status: res.status,
          message: `OpenWeather returned HTTP ${res.status}. Check key or plan limits.`,
        };
      }
    } catch (e: any) {
      return {
        valid: false,
        status: 0,
        message: `Network error connecting to OpenWeather: ${e.message}`,
      };
    }
  },

  async getWeeklyWeather(
    latitude?: number,
    longitude?: number,
    name?: string
  ): Promise<WeeklyWeatherResponse | null> {
    const query = new URLSearchParams();
    if (latitude !== undefined) query.set("lat", latitude.toString());
    if (longitude !== undefined) query.set("lon", longitude.toString());
    if (name) query.set("name", name);

    const data = await safeFetchJson<WeeklyWeatherResponse>(`/api/weekly?${query.toString()}`);
    if (data && data.status === "success") {
      return data;
    }
    return clientWeatherEngine.getWeeklyWeather(latitude, longitude, name);
  },

  async getStations(): Promise<WeatherStationItem[]> {
    const data = await safeFetchJson<{ status: string; stations: WeatherStationItem[] }>("/api/stations");
    if (data && Array.isArray(data.stations)) {
      return data.stations;
    }
    return clientWeatherEngine.getStations();
  },

  async getNearbyComparison(stationId: string): Promise<{
    targetStation: WeatherStationItem | null;
    nearbyStations: NearbyComparisonItem[];
    spatialConsistencyScore: number;
    overallAssessment: string;
  } | null> {
    const data = await safeFetchJson<{
      status: string;
      targetStation: WeatherStationItem | null;
      nearbyStations: NearbyComparisonItem[];
      spatialConsistencyScore: number;
      overallAssessment: string;
    }>(`/api/stations/${encodeURIComponent(stationId)}/nearby`);
    if (data && data.status === "success") {
      return data;
    }
    return clientWeatherEngine.getNearbyComparison(stationId);
  },

  async geocode(query: string): Promise<Array<{
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    timezone: string;
  }>> {
    const data = await safeFetchJson<{
      status: string;
      results: Array<{
        name: string;
        country: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        elevation?: number;
        timezone: string;
      }>;
    }>(`/api/geocode?query=${encodeURIComponent(query)}`);
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return clientWeatherEngine.geocode(query);
  },
};
