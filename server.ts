import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  readAllRecords,
  appendRecordToCsv,
  fetchLiveWeatherFromApi,
  stationConfig,
  CSV_PATH,
  formatTimestamp,
  ensureCsvExists,
} from "./server/weather_collector.js";
import { IsolationForestDetector } from "./server/ml_detector.js";
import { WeatherRecord } from "./server/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const detector = new IsolationForestDetector(0.08);

// Initial bootstrap training on startup
let initialRecords = readAllRecords();
if (initialRecords.length > 0) {
  detector.train(initialRecords);
  console.log(`[WeatherGuard AI] Initialized ML detector with ${initialRecords.length} historical records.`);
}

// Background telemetry collection loop
let collectionTimer: NodeJS.Timeout | null = null;

function startBackgroundCollection() {
  if (collectionTimer) {
    clearInterval(collectionTimer);
  }
  const intervalMs = Math.max(10, stationConfig.collectionIntervalSec) * 1000;
  console.log(`[WeatherGuard AI] Scheduling background collection every ${stationConfig.collectionIntervalSec}s`);
  collectionTimer = setInterval(async () => {
    try {
      await fetchLiveWeatherFromApi();
      const records = readAllRecords();
      detector.train(records);
    } catch (err: any) {
      console.error("[Collector Loop Error]:", err.message);
    }
  }, intervalMs);
}

// Kick off initial collection & background loop
fetchLiveWeatherFromApi().then(() => {
  const records = readAllRecords();
  detector.train(records);
  startBackgroundCollection();
});

// ======================= API ROUTES =======================

/**
 * GET /api/status
 * Returns API connected state, collection status, model status, record count, station coords
 */
app.get("/api/status", (req, res) => {
  const records = readAllRecords();
  const apiConfigured = Boolean(
    stationConfig.apiKey &&
    stationConfig.apiKey.trim() !== "" &&
    stationConfig.apiKey !== "MY_OPENWEATHER_KEY"
  );

  res.json({
    status: "operational",
    api_connected: apiConfigured,
    api_status_text: apiConfigured
      ? "Connected (OpenWeather Live)"
      : "Active (Telemetry Baseline Generator / Awaiting Key)",
    data_collection_active: true,
    collection_interval_sec: stationConfig.collectionIntervalSec,
    ml_model_status:
      records.length >= 5
        ? `Active (Isolation Forest • 100 iTrees • Contamination 0.08)`
        : "Collecting baseline data...",
    total_records: records.length,
    station_coordinates: {
      latitude: stationConfig.latitude,
      longitude: stationConfig.longitude,
    },
    last_updated: records.length > 0 ? records[records.length - 1].timestamp : null,
  });
});

/**
 * GET /api/current
 * Returns latest telemetry reading with real-time anomaly evaluation
 */
app.get("/api/current", (req, res) => {
  const records = readAllRecords();
  if (records.length === 0) {
    return res.status(404).json({
      status: "empty",
      message: "No telemetry records found. Initiating first baseline collection...",
      reading: null,
    });
  }

  detector.train(records);
  const enriched = detector.detectAll(records);
  const latest = enriched[enriched.length - 1];

  res.json({
    status: "success",
    reading: latest,
  });
});

/**
 * GET /api/history
 * Returns chronological historical records for real-time charting
 */
app.get("/api/history", (req, res) => {
  const limit = parseInt((req.query.limit as string) || "40", 10);
  const records = readAllRecords();
  detector.train(records);
  const enriched = detector.detectAll(records);
  const sliced = enriched.slice(-limit);

  res.json({
    status: "success",
    count: sliced.length,
    records: sliced,
  });
});

/**
 * GET /api/anomalies
 * Returns all detected historical and current anomalies
 */
app.get("/api/anomalies", (req, res) => {
  const records = readAllRecords();
  if (records.length === 0) {
    return res.json({ status: "success", count: 0, anomalies: [] });
  }

  detector.train(records);
  const enriched = detector.detectAll(records);
  const anomalies = enriched.filter((r) => r.anomaly);

  res.json({
    status: "success",
    count: anomalies.length,
    anomalies: anomalies.reverse(), // most recent first
  });
});

/**
 * GET /api/health
 * Returns analytical sensor health scores (0-100)
 */
app.get("/api/health", (req, res) => {
  const records = readAllRecords();
  const healthData = detector.calculateSensorHealth(records);

  res.json({
    status: "success",
    sensor_health: healthData,
  });
});

/**
 * POST /api/collect
 * Trigger immediate OpenWeather collection cycle
 */
app.post("/api/collect", async (req, res) => {
  try {
    const result = await fetchLiveWeatherFromApi();
    const records = readAllRecords();
    detector.train(records);
    res.json({
      status: "success",
      message: result.message || "Observation collected successfully.",
      record: result.record,
      isSimulatedFallback: result.isSimulatedFallback,
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * POST /api/simulate-anomaly
 * Injects a synthetic anomaly for live testing (hackathon demonstration tool)
 */
app.post("/api/simulate-anomaly", (req, res) => {
  const { type, customValue } = req.body;
  const records = readAllRecords();
  const last = records.length > 0 ? records[records.length - 1] : null;
  const baseLat = stationConfig.latitude;
  const baseLon = stationConfig.longitude;

  let anomalyRecord: WeatherRecord = {
    timestamp: formatTimestamp(),
    latitude: baseLat,
    longitude: baseLon,
    temperature: last ? last.temperature : 31.4,
    feels_like: last ? last.feels_like : 35.2,
    pressure: last ? last.pressure : 1008.0,
    humidity: last ? last.humidity : 72,
    wind_speed: last ? last.wind_speed : 4.2,
    wind_direction: last ? last.wind_direction : 240,
    cloudiness: last ? last.cloudiness : 65,
    rainfall: 0.0,
    visibility: 10000,
    weather_condition: "Clouds",
  };

  switch (type) {
    case "heat_spike":
      anomalyRecord.temperature = customValue ? parseFloat(customValue) : 48.2;
      anomalyRecord.feels_like = anomalyRecord.temperature + 5.0;
      anomalyRecord.weather_condition = "Extreme Heat";
      break;
    case "pressure_drop":
      anomalyRecord.pressure = customValue ? parseFloat(customValue) : 962.4;
      anomalyRecord.wind_speed = 18.5;
      anomalyRecord.weather_condition = "Storm";
      break;
    case "humidity_plunge":
      anomalyRecord.humidity = customValue ? parseFloat(customValue) : 8.0;
      anomalyRecord.weather_condition = "Dry Air";
      break;
    case "wind_surge":
      anomalyRecord.wind_speed = customValue ? parseFloat(customValue) : 28.4;
      anomalyRecord.weather_condition = "Squall";
      break;
    case "rain_burst":
      anomalyRecord.rainfall = customValue ? parseFloat(customValue) : 42.5;
      anomalyRecord.humidity = 98;
      anomalyRecord.weather_condition = "Heavy Rain";
      break;
    case "sensor_freeze":
      // Stuck constant value
      anomalyRecord.temperature = 0.0;
      anomalyRecord.humidity = 0.0;
      anomalyRecord.weather_condition = "Sensor Malfunction";
      break;
    default:
      anomalyRecord.temperature = 48.2;
      anomalyRecord.feels_like = 53.0;
      break;
  }

  appendRecordToCsv(anomalyRecord);
  const updatedRecords = readAllRecords();
  detector.train(updatedRecords);
  const enriched = detector.detectAll(updatedRecords);
  const evaluatedAnomaly = enriched[enriched.length - 1];

  res.json({
    status: "success",
    message: `Injected simulated anomaly (${type}) to demonstrate Isolation Forest detection.`,
    record: evaluatedAnomaly,
  });
});

/**
 * POST /api/config
 * Update API Key, coordinates, or interval live
 */
app.post("/api/config", (req, res) => {
  const { apiKey, latitude, longitude, collectionIntervalSec } = req.body;
  if (apiKey !== undefined) stationConfig.apiKey = apiKey.trim();
  if (latitude !== undefined) stationConfig.latitude = parseFloat(latitude);
  if (longitude !== undefined) stationConfig.longitude = parseFloat(longitude);
  if (collectionIntervalSec !== undefined) {
    stationConfig.collectionIntervalSec = Math.max(10, parseInt(collectionIntervalSec, 10));
    startBackgroundCollection();
  }

  res.json({
    status: "success",
    message: "Updated AWS station configuration.",
    config: {
      hasApiKey: Boolean(stationConfig.apiKey && stationConfig.apiKey.length > 0),
      latitude: stationConfig.latitude,
      longitude: stationConfig.longitude,
      collectionIntervalSec: stationConfig.collectionIntervalSec,
    },
  });
});

/**
 * GET /api/raw-csv
 * Returns the raw CSV contents
 */
app.get("/api/raw-csv", (req, res) => {
  ensureCsvExists();
  try {
    const csvContent = fs.readFileSync(CSV_PATH, "utf8");
    res.type("text/csv").send(csvContent);
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * POST /api/reset-csv
 * Restores baseline historical data for clean testing
 */
app.post("/api/reset-csv", (req, res) => {
  const seed = [
    "timestamp,latitude,longitude,temperature,feels_like,pressure,humidity,wind_speed,wind_direction,cloudiness,rainfall,visibility,weather_condition",
    "2026-09-18 05:00:00,13.0827,80.2707,27.2,30.1,1010.2,82,3.1,210,40,0.0,9000,Clear",
    "2026-09-18 05:15:00,13.0827,80.2707,27.4,30.4,1010.1,81,3.2,215,42,0.0,9200,Clear",
    "2026-09-18 05:30:00,13.0827,80.2707,27.6,30.8,1009.9,80,3.4,220,45,0.0,9500,Clear",
    "2026-09-18 05:45:00,13.0827,80.2707,27.9,31.2,1009.8,79,3.6,225,48,0.0,10000,Clear",
    "2026-09-18 06:00:00,13.0827,80.2707,28.3,31.8,1009.7,78,3.8,230,50,0.0,10000,Clouds",
    "2026-09-18 06:15:00,13.0827,80.2707,28.7,32.4,1009.5,76,4.0,232,52,0.0,10000,Clouds",
    "2026-09-18 06:30:00,13.0827,80.2707,29.1,33.0,1009.3,75,4.1,235,55,0.0,10000,Clouds",
    "2026-09-18 06:45:00,13.0827,80.2707,29.6,33.7,1009.1,74,4.2,238,58,0.0,10000,Clouds",
    "2026-09-18 07:00:00,13.0827,80.2707,30.0,34.3,1009.0,73,4.3,240,60,0.0,10000,Clouds",
    "2026-09-18 07:15:00,13.0827,80.2707,30.5,35.0,1008.8,72,4.5,242,62,0.0,10000,Clouds",
    "2026-09-18 07:30:00,13.0827,80.2707,30.9,35.5,1008.6,71,4.4,244,63,0.0,10000,Clouds",
    "2026-09-18 07:45:00,13.0827,80.2707,31.2,35.9,1008.3,70,4.6,245,65,0.0,10000,Clouds",
    "2026-09-18 08:00:00,13.0827,80.2707,31.5,36.2,1008.1,69,4.7,248,66,0.0,10000,Clouds",
    "2026-09-18 08:15:00,13.0827,80.2707,31.8,36.6,1008.0,68,4.8,250,68,0.0,10000,Clouds",
    "2026-09-18 08:30:00,13.0827,80.2707,32.1,37.0,1007.8,67,5.0,252,70,0.0,10000,Clouds",
  ].join("\n");

  fs.writeFileSync(CSV_PATH, seed + "\n", "utf8");
  const records = readAllRecords();
  detector.train(records);
  res.json({ status: "success", message: "Reset weather_data.csv to nominal baseline records." });
});

// ======================= VITE & STATIC SERVING =======================

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WeatherGuard AI server running at http://0.0.0.0:${PORT}`);
  });
}

start();
