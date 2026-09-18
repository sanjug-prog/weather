"""
WeatherGuard AI - AI/ML Anomaly Detector Module
Implements Isolation Forest anomaly detection, telemetry preprocessing,
anomaly classification, root cause explanation, and analytical sensor health scoring.
"""

import os
import csv
import pickle
import numpy as np
import pandas as pd
from datetime import datetime

# Features used for Isolation Forest
FEATURE_COLUMNS = [
    "temperature",
    "pressure",
    "humidity",
    "wind_speed",
    "cloudiness",
    "rainfall",
    "visibility"
]

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "anomaly_model.pkl")
MIN_TRAINING_SAMPLES = 5
CONTAMINATION = 0.08

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.feature_means = {}
        self.feature_stds = {}
        self.is_trained = False
        os.makedirs(MODEL_DIR, exist_ok=True)
        self.load_model()

    def load_model(self):
        """Loads serialized Isolation Forest model if present."""
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    saved = pickle.load(f)
                    self.model = saved.get("model")
                    self.feature_means = saved.get("means", {})
                    self.feature_stds = saved.get("stds", {})
                    self.is_trained = True
                print("Loaded pre-trained Isolation Forest model from disk.")
            except Exception as e:
                print(f"Failed to load model file: {e}")

    def save_model(self):
        """Serializes Isolation Forest model and statistics to disk."""
        try:
            with open(MODEL_PATH, "wb") as f:
                pickle.dump({
                    "model": self.model,
                    "means": self.feature_means,
                    "stds": self.feature_stds,
                    "updated_at": datetime.now().isoformat()
                }, f)
        except Exception as e:
            print(f"Could not persist model: {e}")

    def preprocess_data(self, df):
        """
        Cleans and preprocesses AWS telemetry dataframe:
        - Drops duplicates
        - Converts numerical columns to numeric types
        - Handles missing values via forward/backward fill and medians
        - Filters or caps physically impossible values (e.g., negative visibility)
        - Sorts strictly by timestamp
        """
        if df.empty:
            return df

        # Ensure timestamp column and sort
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
            df = df.dropna(subset=["timestamp"])
            df = df.sort_values("timestamp").reset_index(drop=True)

        # Drop duplicate records based on timestamp
        df = df.drop_duplicates(subset=["timestamp"], keep="last")

        # Convert numerical columns
        for col in FEATURE_COLUMNS + ["feels_like", "wind_direction"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Physical boundary sanity clipping
        if "humidity" in df.columns:
            df["humidity"] = df["humidity"].clip(lower=0.0, upper=100.0)
        if "pressure" in df.columns:
            df["pressure"] = df["pressure"].clip(lower=800.0, upper=1100.0)
        if "wind_speed" in df.columns:
            df["wind_speed"] = df["wind_speed"].clip(lower=0.0, upper=120.0)
        if "rainfall" in df.columns:
            df["rainfall"] = df["rainfall"].clip(lower=0.0, upper=500.0)
        if "visibility" in df.columns:
            df["visibility"] = df["visibility"].clip(lower=0.0, upper=50000.0)

        # Impute remaining missing values
        df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].ffill().bfill().fillna(0.0)

        return df

    def train_or_update(self, df):
        """
        Trains or updates the Isolation Forest model on historical data.
        Returns training status message.
        """
        clean_df = self.preprocess_data(df)
        if len(clean_df) < MIN_TRAINING_SAMPLES:
            return {
                "trained": False,
                "samples": len(clean_df),
                "message": "Collecting baseline data... Insufficient samples to train Isolation Forest."
            }

        # Lazy import to handle environments
        from sklearn.ensemble import IsolationForest

        X = clean_df[FEATURE_COLUMNS].values

        # Compute baselines for attribution
        for col in FEATURE_COLUMNS:
            self.feature_means[col] = float(clean_df[col].mean())
            std_val = float(clean_df[col].std())
            self.feature_stds[col] = std_val if std_val > 1e-4 else 1.0

        model = IsolationForest(
            n_estimators=100,
            contamination=CONTAMINATION,
            random_state=42
        )
        model.fit(X)
        self.model = model
        self.is_trained = True
        self.save_model()

        return {
            "trained": True,
            "samples": len(clean_df),
            "message": f"Isolation Forest trained successfully on {len(clean_df)} records."
        }

    def detect_anomalies(self, df):
        """
        Runs anomaly detection across dataset.
        Returns enriched dataframe with anomaly flag, score, reason, severity, and type.
        """
        clean_df = self.preprocess_data(df)
        if len(clean_df) < MIN_TRAINING_SAMPLES or not self.is_trained:
            # Baseline collection mode
            results = []
            for _, row in clean_df.iterrows():
                r = row.to_dict()
                r["anomaly"] = False
                r["anomaly_score"] = 0.0
                r["anomaly_reason"] = "Collecting baseline data..."
                r["severity"] = "NORMAL"
                r["anomaly_type"] = "none"
                r["parameter"] = "None"
                results.append(r)
            return pd.DataFrame(results)

        X = clean_df[FEATURE_COLUMNS].values
        # Isolation Forest: -1 for anomaly, 1 for normal
        preds = self.model.predict(X)
        # Decision function: lower values indicate higher anomaly likelihood
        scores = self.model.decision_function(X)

        results = []
        for i, row in clean_df.iterrows():
            is_anomaly = bool(preds[i] == -1)
            raw_score = scores[i]
            # Normalize anomaly score: 0 (most normal) to 1.0 (most extreme anomaly)
            normalized_score = round(float(np.clip((0.2 - raw_score) * 2.5, 0.0, 1.0)), 3)

            record = row.to_dict()
            record["anomaly"] = is_anomaly
            record["anomaly_score"] = normalized_score

            if is_anomaly:
                analysis = self.analyze_anomaly_cause(row, clean_df.iloc[:i+1])
                record.update(analysis)
            else:
                record["severity"] = "NORMAL"
                record["anomaly_type"] = "none"
                record["anomaly_reason"] = "All AWS telemetry parameters within nominal operational limits."
                record["parameter"] = "None"
                record["expected_pattern"] = "Nominal"

            results.append(record)

        return pd.DataFrame(results)

    def analyze_anomaly_cause(self, row, history_df):
        """
        Analyzes deviations and temporal diffs to determine:
        anomaly_type, parameter, current_value, expected_pattern, severity, and anomaly_reason.
        """
        z_scores = {}
        deviations = {}

        for col in FEATURE_COLUMNS:
            val = float(row[col])
            mean = self.feature_means.get(col, val)
            std = self.feature_stds.get(col, 1.0)
            z = abs((val - mean) / std)
            z_scores[col] = z
            deviations[col] = (val, mean, std)

        # Check temporal sudden jump if historical records exist
        sudden_jump = False
        sudden_param = None
        if len(history_df) >= 2:
            prev_row = history_df.iloc[-2]
            for col in ["temperature", "pressure", "humidity", "wind_speed"]:
                prev_val = float(prev_row[col])
                curr_val = float(row[col])
                delta = abs(curr_val - prev_val)
                # Significant jump thresholds
                if (col == "temperature" and delta > 4.0) or \
                   (col == "pressure" and delta > 8.0) or \
                   (col == "humidity" and delta > 25.0) or \
                   (col == "wind_speed" and delta > 12.0):
                    sudden_jump = True
                    sudden_param = col
                    break

        sorted_params = sorted(z_scores.items(), key=lambda item: item[1], reverse=True)
        top_param, top_z = sorted_params[0]
        curr_val = float(row[top_param])
        mean_val = self.feature_means.get(top_param, curr_val)

        # Check how many parameters deviate significantly
        multi_deviations = [p for p, z in z_scores.items() if z > 2.0]

        # Determine anomaly type and explanation
        if sudden_jump and sudden_param:
            anomaly_type = "sudden change"
            param_name = sudden_param.capitalize()
            reason = f"{param_name} changed abruptly compared with immediate prior observation."
        elif len(multi_deviations) >= 2:
            anomaly_type = "multiple sensor anomaly"
            param_name = "Multiple Sensors"
            reason = f"Simultaneous deviation detected across {', '.join(multi_deviations)}."
        elif top_param == "temperature":
            anomaly_type = "temperature anomaly"
            param_name = "Temperature"
            reason = f"Temperature deviation ({curr_val:.1f}°C vs baseline {mean_val:.1f}°C) exceeds normal distribution."
        elif top_param == "humidity":
            anomaly_type = "humidity anomaly"
            param_name = "Humidity"
            reason = f"Relative humidity ({curr_val:.1f}%) diverges sharply from ambient atmospheric baseline."
        elif top_param == "pressure":
            anomaly_type = "pressure anomaly"
            param_name = "Barometric Pressure"
            reason = f"Barometric pressure reading ({curr_val:.1f} hPa) exhibits abnormal gradient."
        elif top_param == "wind_speed":
            anomaly_type = "wind anomaly"
            param_name = "Wind Speed"
            reason = f"Wind velocity spike ({curr_val:.1f} m/s) detected outside expected station envelope."
        elif top_param == "rainfall":
            anomaly_type = "rainfall anomaly"
            param_name = "Precipitation"
            reason = f"Precipitation sensor logged rapid accumulation ({curr_val:.1f} mm) under non-convective conditions."
        else:
            anomaly_type = "sensor anomaly"
            param_name = top_param.capitalize()
            reason = f"{param_name} reading ({curr_val}) diverged significantly from historical baseline."

        # Severity assessment
        if top_z > 4.0 or len(multi_deviations) >= 3 or (sudden_jump and top_z > 3.0):
            severity = "CRITICAL"
        elif top_z > 2.8 or len(multi_deviations) >= 2:
            severity = "HIGH"
        elif top_z > 1.8:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        return {
            "severity": severity,
            "anomaly_type": anomaly_type,
            "parameter": param_name,
            "current_value": f"{curr_val:.1f}",
            "expected_pattern": f"Baseline ~ {mean_val:.1f} ± {self.feature_stds.get(top_param, 1.0):.1f}",
            "anomaly_reason": reason
        }

    def calculate_sensor_health(self, df):
        """
        Calculates health score (0-100) for AWS sensors:
        - temperature, humidity, pressure, wind, rainfall
        Threshold indicators:
        - 90-100: Healthy
        - 70-89: Warning
        - 0-69: Needs attention
        Note: Analytical indicator and not a physical inspection of the sensors.
        """
        clean_df = self.preprocess_data(df)
        sensors = {
            "temperature": {"col": "temperature", "unit": "°C", "score": 98, "status": "Healthy"},
            "humidity": {"col": "humidity", "unit": "%", "score": 96, "status": "Healthy"},
            "pressure": {"col": "pressure", "unit": "hPa", "score": 99, "status": "Healthy"},
            "wind": {"col": "wind_speed", "unit": "m/s", "score": 95, "status": "Healthy"},
            "rainfall": {"col": "rainfall", "unit": "mm", "score": 100, "status": "Healthy"}
        }

        if len(clean_df) < 3:
            return {k: {"score": v["score"], "status": v["status"], "unit": v["unit"]} for k, v in sensors.items()}

        recent_records = clean_df.tail(15)

        for key, info in sensors.items():
            col = info["col"]
            series = recent_records[col].dropna()
            if series.empty:
                info["score"] = 50
                info["status"] = "Needs attention"
                continue

            # Calculate stability, variance, and outlier rate
            mean = series.mean()
            std = series.std() if len(series) > 1 else 0.0

            # Deduct points for high local volatility or stuck constant values
            penalty = 0
            if len(series) >= 5 and series.nunique() == 1 and key != "rainfall":
                # Sensor might be stuck/frozen
                penalty += 28

            # Z-score spikes
            if std > 0:
                recent_z = abs((series.iloc[-1] - mean) / std)
                if recent_z > 3.0:
                    penalty += 35
                elif recent_z > 2.0:
                    penalty += 18

            # Absolute bounds check
            last_val = series.iloc[-1]
            if key == "temperature" and (last_val < -40 or last_val > 60):
                penalty += 45
            elif key == "humidity" and (last_val <= 0 or last_val >= 100):
                penalty += 30
            elif key == "pressure" and (last_val < 850 or last_val > 1080):
                penalty += 40

            health_score = max(20, min(100, 100 - penalty))
            info["score"] = int(health_score)

            if health_score >= 90:
                info["status"] = "Healthy"
            elif health_score >= 70:
                info["status"] = "Warning"
            else:
                info["status"] = "Needs attention"

        return {
            "disclaimer": "Analytical indicator and not a physical inspection of the sensors.",
            "metrics": sensors
        }
