"""
WeatherGuard AI - Flask RESTful Backend API
Provides API endpoints for live status, current readings, historical telemetry,
ML anomaly detection, and sensor analytical health indicators.
"""

import os
import pandas as pd
from flask import Flask, jsonify, request
from dotenv import load_dotenv

from weather_api import OpenWeatherAPI
from data_collector import CSV_PATH, ensure_csv_exists, append_record_to_csv, collect_once
from anomaly_detector import AnomalyDetector

load_dotenv()

app = Flask(__name__)
detector = AnomalyDetector()
weather_client = OpenWeatherAPI()

def load_data_df():
    """Safely loads weather data CSV as a pandas DataFrame."""
    ensure_csv_exists()
    if not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0:
        return pd.DataFrame()
    try:
        return pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return pd.DataFrame()

@app.route("/api/status", methods=["GET"])
def get_status():
    """
    Returns live system status:
    - API connection status
    - Data collection activity
    - ML model training & sample count
    - Station coordinate metadata
    """
    df = load_data_df()
    sample_count = len(df)
    api_ready = weather_client.is_configured()

    return jsonify({
        "status": "operational",
        "api_connected": api_ready,
        "api_status_text": "Connected" if api_ready else "Configured via Server Fallback / Awaiting Key",
        "data_collection_active": True,
        "collection_interval_sec": int(os.getenv("COLLECTION_INTERVAL", "60")),
        "ml_model_status": "Active (Isolation Forest)" if sample_count >= 5 else "Collecting baseline data...",
        "total_records": sample_count,
        "station_coordinates": {
            "latitude": weather_client.latitude,
            "longitude": weather_client.longitude
        },
        "last_updated": df["timestamp"].iloc[-1] if not df.empty and "timestamp" in df.columns else None
    })

@app.route("/api/current", methods=["GET"])
def get_current():
    """
    Returns the latest weather reading and immediate anomaly classification.
    """
    df = load_data_df()
    if df.empty:
        return jsonify({
            "status": "empty",
            "message": "No telemetry records found. Initiating first baseline collection...",
            "data": None
        }), 404

    # Run detection on all clean data to get latest evaluated state
    detector.train_or_update(df)
    enriched_df = detector.detect_anomalies(df)
    latest_record = enriched_df.iloc[-1].to_dict()

    return jsonify({
        "status": "success",
        "reading": latest_record
    })

@app.route("/api/history", methods=["GET"])
def get_history():
    """
    Returns chronological historical telemetry for charting.
    Accepts optional query parameter 'limit' (default 50).
    """
    limit = int(request.args.get("limit", 50))
    df = load_data_df()
    if df.empty:
        return jsonify({"status": "success", "count": 0, "records": []})

    clean_df = detector.preprocess_data(df)
    records = clean_df.tail(limit).to_dict(orient="records")

    return jsonify({
        "status": "success",
        "count": len(records),
        "records": records
    })

@app.route("/api/anomalies", methods=["GET"])
def get_anomalies():
    """
    Returns list of detected anomalies from telemetry data.
    """
    df = load_data_df()
    if df.empty:
        return jsonify({"status": "success", "count": 0, "anomalies": []})

    detector.train_or_update(df)
    enriched = detector.detect_anomalies(df)
    anomalies_df = enriched[enriched["anomaly"] == True]
    anomalies_list = anomalies_df.to_dict(orient="records")

    return jsonify({
        "status": "success",
        "count": len(anomalies_list),
        "anomalies": anomalies_list
    })

@app.route("/api/health", methods=["GET"])
def get_health():
    """
    Returns sensor health scores (0-100) and indicators:
    Healthy (90-100), Warning (70-89), Needs attention (0-69).
    """
    df = load_data_df()
    health_info = detector.calculate_sensor_health(df)
    return jsonify({
        "status": "success",
        "sensor_health": health_info
    })

@app.route("/api/collect", methods=["POST"])
def trigger_collect():
    """Manually triggers an immediate data collection cycle."""
    try:
        data = collect_once()
        return jsonify({"status": "success", "message": "Telemetry collected", "record": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
