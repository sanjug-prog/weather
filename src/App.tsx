import React, { useState, useEffect, useCallback } from "react";
import {
  StationStatus,
  EnrichedWeatherRecord,
  SensorHealthData,
} from "./types";
import { Header } from "./components/Header";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { AnomalyAlertPanel } from "./components/AnomalyAlertPanel";
import { WeatherMetricsGrid } from "./components/WeatherMetricsGrid";
import { TelemetryCharts } from "./components/TelemetryCharts";
import { SensorHealthGrid } from "./components/SensorHealthGrid";
import { AnomalyHistoryDrawer } from "./components/AnomalyHistoryDrawer";
import { SimulateAnomalyModal } from "./components/SimulateAnomalyModal";
import { StationConfigModal } from "./components/StationConfigModal";
import { RawCsvViewerModal } from "./components/RawCsvViewerModal";

export default function App() {
  const [status, setStatus] = useState<StationStatus | null>(null);
  const [currentReading, setCurrentReading] = useState<EnrichedWeatherRecord | null>(null);
  const [history, setHistory] = useState<EnrichedWeatherRecord[]>([]);
  const [anomalies, setAnomalies] = useState<EnrichedWeatherRecord[]>([]);
  const [healthData, setHealthData] = useState<SensorHealthData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Modals
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isCsvOpen, setIsCsvOpen] = useState<boolean>(false);

  // Fetch all endpoints smoothly
  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Status
      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
      }

      // 2. Current
      const currentRes = await fetch("/api/current");
      if (currentRes.ok) {
        const cData = await currentRes.json();
        setCurrentReading(cData.reading);
      }

      // 3. History
      const historyRes = await fetch("/api/history?limit=30");
      if (historyRes.ok) {
        const hData = await historyRes.json();
        setHistory(hData.records || []);
      }

      // 4. Anomalies
      const anomaliesRes = await fetch("/api/anomalies");
      if (anomaliesRes.ok) {
        const aData = await anomaliesRes.json();
        setAnomalies(aData.anomalies || []);
      }

      // 5. Health
      const healthRes = await fetch("/api/health");
      if (healthRes.ok) {
        const hlData = await healthRes.json();
        setHealthData(hlData.sensor_health);
      }
    } catch (err: any) {
      console.error("[Dashboard Fetch Error]:", err.message);
    }
  }, []);

  // Initial load and periodic polling interval (auto-refresh every 5 seconds)
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Trigger manual collection
  const handleManualIngest = async () => {
    setIsRefreshing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBannerMessage(`New weather reading saved!`);
        await fetchDashboardData();
      } else {
        setBannerMessage(`Notice: ${data.message}`);
      }
    } catch (err: any) {
      setBannerMessage(`Error: ${err.message}`);
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setBannerMessage(null), 4000);
    }
  };

  // Trigger simulated anomaly
  const handleSimulateAnomaly = async (type: string, customValue?: number) => {
    try {
      const res = await fetch("/api/simulate-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, customValue }),
      });
      if (res.ok) {
        await fetchDashboardData();
        setBannerMessage(`Test weather reading saved. AI checked the data!`);
        setTimeout(() => setBannerMessage(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Update configuration
  const handleSaveConfig = async (cfg: {
    apiKey?: string;
    latitude?: number;
    longitude?: number;
    collectionIntervalSec?: number;
  }) => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update configuration");
    }
    await fetchDashboardData();
  };

  // Reset CSV
  const handleResetCsv = async () => {
    const res = await fetch("/api/reset-csv", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to reset CSV");
    }
    await fetchDashboardData();
  };

  return (
    <div id="weatherguard-app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <Header
        status={status}
        onRefresh={handleManualIngest}
        isRefreshing={isRefreshing}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenCsv={() => setIsCsvOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Optional Notification Toast */}
      {bannerMessage && (
        <div
          id="system-notification-banner"
          className="bg-blue-600 text-white text-xs font-medium py-2 px-4 text-center border-b border-blue-700 shadow-sm animate-fade-in"
        >
          {bannerMessage}
        </div>
      )}

      {/* Main Dashboard Content Area */}
      <main id="main-dashboard-canvas" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Section 1: Live Status Bar */}
        <LiveStatusBar status={status} lastUpdated={currentReading?.timestamp || status?.last_updated || null} />

        {/* Section 2: Anomaly Alert & Diagnosis Panel */}
        <AnomalyAlertPanel
          currentReading={currentReading}
          onOpenHistory={() => setIsHistoryOpen(true)}
          anomalyCount={anomalies.length}
        />

        {/* Section 3: Current Weather Cards */}
        <WeatherMetricsGrid reading={currentReading} />

        {/* Section 4: Weather Graphs Over Time */}
        <TelemetryCharts history={history} />

        {/* Section 5: Sensor Health Scores */}
        <SensorHealthGrid healthData={healthData} />
      </main>

      {/* Footer */}
      <footer id="dashboard-footer" className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-slate-700 font-medium">
            <span className="font-bold text-slate-900">WeatherGuard AI</span> • Weather Station Smart Monitor & Problem Detector
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Saved to: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">weather_data.csv</code></span>
            <span>AI: Pattern Anomaly Detector</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <SimulateAnomalyModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulateAnomaly}
      />

      <AnomalyHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        anomalies={anomalies}
      />

      <StationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        status={status}
        onSaveConfig={handleSaveConfig}
        onResetCsv={handleResetCsv}
      />

      <RawCsvViewerModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
      />
    </div>
  );
}
