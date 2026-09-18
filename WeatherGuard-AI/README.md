# WeatherGuard AI
### AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations (AWS)

WeatherGuard AI is an industrial-grade telemetry monitoring and intelligent anomaly detection platform designed for Automatic Weather Stations (AWS). It continuously ingests real-time observations from OpenWeather API, persists streaming data into standardized CSV records, performs statistical preprocessing, executes Isolation Forest machine learning anomaly detection, classifies sensor faults, and provides an operational dashboard.

---

## 📁 Project Structure

```
WeatherGuard-AI/
├── backend/
│   ├── app.py                 # Flask RESTful Backend API (/api/current, /api/history, /api/status, etc.)
│   ├── weather_api.py         # OpenWeather API integration client with metric units & error handling
│   ├── data_collector.py      # Background telemetry collector saving to CSV (60s loop)
│   ├── anomaly_detector.py    # Isolation Forest ML, preprocessing, attribution & sensor health scoring
│   ├── requirements.txt       # Python dependencies (scikit-learn, pandas, numpy, flask, requests)
│   └── .env                   # Configuration file (OPENWEATHER_API_KEY, coordinates, interval)
├── data/
│   └── weather_data.csv       # Standardized CSV telemetry data store
├── model/
│   └── anomaly_model.pkl      # Serialized Isolation Forest model & baseline distribution parameters
├── frontend/
│   ├── index.html             # Industrial dashboard layout
│   ├── style.css              # Custom styling with dark mode AWS theme
│   └── script.js              # Real-time polling, Chart.js graphs, anomaly alert rendering
└── README.md
```

---

## ⚡ Key Features

1. **Live OpenWeather Ingestion**
   - Collects 13 AWS parameters: `timestamp`, `latitude`, `longitude`, `temperature`, `feels_like`, `pressure`, `humidity`, `wind_speed`, `wind_direction`, `cloudiness`, `rainfall`, `visibility`, `weather_condition`.
   - Metric units enforced (`units=metric`).
   - Graceful failover with clear diagnostic messages for invalid keys or network dropouts.

2. **Continuous CSV Persistence**
   - Appends records chronologically to `data/weather_data.csv`.
   - Guaranteed non-destructive write (never overwrites historical data).
   - Automatically initializes file with standardized headers if missing.

3. **Data Preprocessing Pipeline**
   - Duplicate timestamp removal.
   - Forward/backward filling and numerical coercion.
   - Physical boundary clipping (e.g. pressure 800-1100 hPa, humidity 0-100%).
   - Chronological sorting.

4. **Isolation Forest Anomaly Detection**
   - Multi-dimensional feature matrix: `[temperature, pressure, humidity, wind_speed, cloudiness, rainfall, visibility]`.
   - Contamination parameter: `0.08`.
   - Graceful baseline check (`Collecting baseline data...` if samples < 5).
   - Generates normalized anomaly score $[0.0, 1.0]$ and severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

5. **Anomaly Group Classification & Root Cause Explanation**
   - `temperature anomaly`
   - `humidity anomaly`
   - `pressure anomaly`
   - `wind anomaly`
   - `rainfall anomaly`
   - `multiple sensor anomaly`
   - `sudden change`
   - `sensor anomaly`
   - Root cause reason generation (e.g., *"Temperature deviation (48.2°C vs baseline 31.5°C) exceeds normal distribution"*).

6. **Analytical Sensor Health Index (0-100)**
   - Computes analytical reliability scores for `temperature`, `humidity`, `pressure`, `wind`, and `rainfall`.
   - Health status brackets:
     - **90–100**: Healthy
     - **70–89**: Warning
     - **0–69**: Needs Attention
   - *Notice: Analytical indicator and not a physical inspection of the sensors.*

---

## 🚀 Running the Python Backend

1. **Install Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Configure Environment Variables:**
   Edit `backend/.env` or set environment variables:
   ```env
   OPENWEATHER_API_KEY="your_api_key_here"
   LATITUDE="13.0827"
   LONGITUDE="80.2707"
   COLLECTION_INTERVAL="60"
   ```

3. **Run the Data Collector:**
   ```bash
   python backend/data_collector.py
   ```

4. **Run the Flask API Server:**
   ```bash
   python backend/app.py
   ```
   API runs on `http://localhost:5000`.

---

## 🌐 API Endpoints

- `GET /api/current` - Latest weather observation and immediate ML anomaly status.
- `GET /api/history?limit=50` - Historical chronological records for charting.
- `GET /api/anomalies` - Filtered list of detected anomalies.
- `GET /api/status` - Live system status (API status, collector loop, ML model status, record count).
- `GET /api/health` - Sensor health scores (0-100) and indicators.
- `POST /api/collect` - Triggers an immediate OpenWeather API ingestion cycle.
