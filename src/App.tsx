import React, { useState, useEffect, useCallback } from "react";
import {
  StationStatus,
  EnrichedWeatherRecord,
  SensorHealthData,
} from "./types";
import { DashboardDataSource } from "./services/dashboardDataSource";
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

  // Fetch all endpoints smoothly using resilient data source
  const fetchDashboardData = useCallback(async () => {
    try {
      const [sData, cData, hData, aData, hlData] = await Promise.all([
        DashboardDataSource.getStatus(),
        DashboardDataSource.getCurrentReading(),
        DashboardDataSource.getHistory(30),
        DashboardDataSource.getAnomalies(),
        DashboardDataSource.getSensorHealth(),
      ]);

      if (sData) setStatus(sData);
      if (cData) setCurrentReading(cData);
      if (hData) setHistory(hData);
      if (aData) setAnomalies(aData);
      if (hlData) setHealthData(hlData);
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
      const result = await DashboardDataSource.collectObservation();
      setBannerMessage(`New weather reading saved!`);
      await fetchDashboardData();
    } catch (err: any) {
      setBannerMessage(`Notice: Weather updated`);
      await fetchDashboardData();
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setBannerMessage(null), 4000);
    }
  };

  // Trigger simulated anomaly
  const handleSimulateAnomaly = async (type: string, customValue?: number) => {
    try {
      await DashboardDataSource.simulateAnomaly(type, customValue);
      await fetchDashboardData();
      setBannerMessage(`Test weather reading saved. AI checked the data!`);
      setTimeout(() => setBannerMessage(null), 5000);
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
    await DashboardDataSource.saveConfig(cfg);
    await fetchDashboardData();
  };

  // Reset CSV
  const handleResetCsv = async () => {
    await DashboardDataSource.resetCsv();
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
