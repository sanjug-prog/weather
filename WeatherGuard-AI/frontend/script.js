// WeatherGuard AI Frontend script
let tempChart, humidityChart, pressureChart, windChart;

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  fetchDashboardData();
  // Auto refresh every 5 seconds
  setInterval(fetchDashboardData, 5000);
});

function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "#1f2937" }, ticks: { color: "#9ca3af", maxTicksLimit: 6 } },
      y: { grid: { color: "#1f2937" }, ticks: { color: "#9ca3af" } }
    }
  };

  const createChart = (id, label, color) => {
    const ctx = document.getElementById(id).getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [{ label, data: [], borderColor: color, backgroundColor: color + "20", tension: 0.3, fill: true }] },
      options: chartOptions
    });
  };

  tempChart = createChart("tempChart", "Temperature (°C)", "#3b82f6");
  humidityChart = createChart("humidityChart", "Humidity (%)", "#06b6d4");
  pressureChart = createChart("pressureChart", "Pressure (hPa)", "#8b5cf6");
  windChart = createChart("windChart", "Wind Speed (m/s)", "#10b981");
}

async function fetchDashboardData() {
  try {
    // 1. Status
    const statusRes = await fetch("/api/status");
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      document.getElementById("status-api").innerText = statusData.api_connected ? "Connected" : "Fallback / Active";
      document.getElementById("status-model").innerText = statusData.ml_model_status;
      document.getElementById("status-records").innerText = statusData.total_records || "0";
      if (statusData.station_coordinates) {
        document.getElementById("station-coords").innerText = 
          `AWS Lat: ${statusData.station_coordinates.latitude}, Lon: ${statusData.station_coordinates.longitude}`;
      }
      if (statusData.last_updated) {
        document.getElementById("last-updated").innerText = `Last telemetry: ${statusData.last_updated}`;
      }
    }

    // 2. Current Readings & Anomaly
    const currentRes = await fetch("/api/current");
    if (currentRes.ok) {
      const currentJson = await currentRes.json();
      const reading = currentJson.reading;
      if (reading) {
        document.getElementById("val-temp").innerHTML = `${reading.temperature.toFixed(1)} <span class="unit">°C</span>`;
        document.getElementById("sub-feels").innerText = `Feels like ${reading.feels_like ? reading.feels_like.toFixed(1) : reading.temperature.toFixed(1)} °C`;
        document.getElementById("val-humidity").innerHTML = `${reading.humidity.toFixed(0)} <span class="unit">%</span>`;
        document.getElementById("val-pressure").innerHTML = `${reading.pressure.toFixed(1)} <span class="unit">hPa</span>`;
        document.getElementById("val-wind").innerHTML = `${reading.wind_speed.toFixed(1)} <span class="unit">m/s</span>`;
        document.getElementById("sub-wind-dir").innerText = `Direction: ${reading.wind_direction}°`;
        document.getElementById("val-rain").innerHTML = `${reading.rainfall.toFixed(1)} <span class="unit">mm</span>`;
        document.getElementById("val-visibility").innerHTML = `${reading.visibility.toFixed(0)} <span class="unit">m</span>`;
        document.getElementById("sub-condition").innerText = `Condition: ${reading.weather_condition || "Nominal"}`;

        // Anomaly panel
        const anomalyCard = document.getElementById("anomaly-card");
        const badge = document.getElementById("anomaly-badge");
        if (reading.anomaly) {
          anomalyCard.className = "anomaly-card danger";
          badge.innerText = `⚠ ANOMALY DETECTED [${reading.severity || "HIGH"}]`;
          document.getElementById("anomaly-timestamp").innerText = reading.timestamp;
          document.getElementById("anomaly-param").innerText = reading.parameter || reading.anomaly_type;
          document.getElementById("anomaly-current").innerText = `${reading.current_value || reading.temperature}`;
          document.getElementById("anomaly-severity").innerText = reading.severity || "HIGH";
          document.getElementById("anomaly-score").innerText = reading.anomaly_score ? reading.anomaly_score.toFixed(3) : "0.850";
          document.getElementById("anomaly-reason").innerText = reading.anomaly_reason || "Sudden deviation detected.";
        } else {
          anomalyCard.className = "anomaly-card normal";
          badge.innerText = "NOMINAL TELEMETRY";
          document.getElementById("anomaly-timestamp").innerText = reading.timestamp;
          document.getElementById("anomaly-param").innerText = "None";
          document.getElementById("anomaly-current").innerText = "Within Limits";
          document.getElementById("anomaly-severity").innerText = "NORMAL";
          document.getElementById("anomaly-score").innerText = reading.anomaly_score ? reading.anomaly_score.toFixed(3) : "0.00";
          document.getElementById("anomaly-reason").innerText = reading.anomaly_reason || "All AWS telemetry parameters within nominal operational limits.";
        }
      }
    }

    // 3. Historical Telemetry for Graphs
    const historyRes = await fetch("/api/history?limit=30");
    if (historyRes.ok) {
      const historyJson = await historyRes.json();
      const records = historyJson.records || [];
      const labels = records.map(r => r.timestamp ? r.timestamp.split(" ")[1] || r.timestamp : "");
      
      const updateChart = (chart, data) => {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
      };

      updateChart(tempChart, records.map(r => r.temperature));
      updateChart(humidityChart, records.map(r => r.humidity));
      updateChart(pressureChart, records.map(r => r.pressure));
      updateChart(windChart, records.map(r => r.wind_speed));
    }

    // 4. Sensor Health
    const healthRes = await fetch("/api/health");
    if (healthRes.ok) {
      const healthJson = await healthRes.json();
      const metrics = healthJson.sensor_health ? healthJson.sensor_health.metrics : {};
      const container = document.getElementById("health-grid");
      container.innerHTML = "";

      Object.entries(metrics).forEach(([key, info]) => {
        let barClass = "healthy";
        if (info.score < 70) barClass = "danger";
        else if (info.score < 90) barClass = "warning";

        const item = document.createElement("div");
        item.className = "health-item";
        item.innerHTML = `
          <div class="health-name">
            <span style="text-transform: capitalize;">${key} Sensor</span>
            <span class="${barClass}">${info.score}/100 (${info.status})</span>
          </div>
          <div class="health-bar-bg">
            <div class="health-bar-fill ${barClass}" style="width: ${info.score}%"></div>
          </div>
        `;
        container.appendChild(item);
      });
    }
  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }
}
