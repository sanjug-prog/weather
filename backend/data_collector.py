"""
WeatherGuard AI - Live Data Collector Module
Periodically collects AWS telemetry from OpenWeather API and persists
records to CSV without overwriting historical measurements.
"""

import os
import csv
import time
from datetime import datetime
from weather_api import OpenWeatherAPI

COLLECTION_INTERVAL = int(os.getenv("COLLECTION_INTERVAL", "60"))
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CSV_PATH = os.path.join(DATA_DIR, "weather_data.csv")

CSV_HEADERS = [
    "timestamp",
    "latitude",
    "longitude",
    "temperature",
    "feels_like",
    "pressure",
    "humidity",
    "wind_speed",
    "wind_direction",
    "cloudiness",
    "rainfall",
    "visibility",
    "weather_condition"
]

def ensure_csv_exists():
    """Ensures data directory and CSV file with appropriate headers exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0:
        with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)
        print(f"Initialized new CSV at {CSV_PATH} with headers.")

def append_record_to_csv(record):
    """Appends a new weather record row to the CSV file."""
    ensure_csv_exists()
    row = [
        record.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        record.get("latitude", 0.0),
        record.get("longitude", 0.0),
        record.get("temperature", 0.0),
        record.get("feels_like", 0.0),
        record.get("pressure", 1013.25),
        record.get("humidity", 50.0),
        record.get("wind_speed", 0.0),
        record.get("wind_direction", 0.0),
        record.get("cloudiness", 0.0),
        record.get("rainfall", 0.0),
        record.get("visibility", 10000.0),
        record.get("weather_condition", "Clear")
    ]
    with open(CSV_PATH, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(row)
    print(f"[{row[0]}] Appended AWS telemetry record to {CSV_PATH}")

def collect_once():
    """Runs a single live collection cycle."""
    api = OpenWeatherAPI()
    data = api.fetch_live_weather()
    append_record_to_csv(data)
    return data

def run_collector_loop():
    """Runs the continuous telemetry collection background loop."""
    print(f"Starting WeatherGuard AI data collection loop (Interval: {COLLECTION_INTERVAL}s)...")
    ensure_csv_exists()
    api = OpenWeatherAPI()

    while True:
        try:
            record = api.fetch_live_weather()
            append_record_to_csv(record)
        except Exception as e:
            print(f"[Error in data collection cycle]: {e}")
        time.sleep(COLLECTION_INTERVAL)

if __name__ == "__main__":
    run_collector_loop()
