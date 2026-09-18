import React from "react";
import { StationStatus } from "../types";
import { Radio, RefreshCw, AlertTriangle, FileSpreadsheet, Settings, ShieldCheck } from "lucide-react";

interface HeaderProps {
  status: StationStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSimulate: () => void;
  onOpenCsv: () => void;
  onOpenConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onRefresh,
  isRefreshing,
  onOpenSimulate,
  onOpenCsv,
  onOpenConfig,
}) => {
  return (
    <header id="header-main" className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 py-3.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand identity */}
        <div id="header-brand-block" className="flex items-center gap-3.5">
          <div id="header-brand-badge" className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg tracking-wider shadow-lg shadow-blue-500/20">
            WG
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 id="header-title" className="text-xl font-bold tracking-tight text-white font-mono uppercase">
                WeatherGuard AI
              </h1>
              <span id="header-version-tag" className="text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                AWS ML v2.4
              </span>
            </div>
            <p id="header-subtitle" className="text-xs text-slate-400 font-medium">
              AI/ML-Based Intelligent Automatic Weather Station (AWS) Anomaly Detection
            </p>
          </div>
        </div>

        {/* Action Controls & Telemetry Meta */}
        <div id="header-controls-block" className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {/* Station location badge */}
          <div id="header-station-location" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              AWS: {status?.station_coordinates.latitude.toFixed(4)}°N, {status?.station_coordinates.longitude.toFixed(4)}°E
            </span>
          </div>

          {/* Action Buttons */}
          <button
            id="btn-collect-telemetry"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Poll immediate OpenWeather observation and append to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Ingesting..." : "Ingest Telemetry"}</span>
          </button>

          <button
            id="btn-simulate-anomaly"
            onClick={onOpenSimulate}
            title="Inject simulated spike or glitch to test Isolation Forest ML"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Anomaly</span>
          </button>

          <button
            id="btn-view-raw-csv"
            onClick={onOpenCsv}
            title="Inspect raw weather_data.csv storage file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Raw CSV</span>
          </button>

          <button
            id="btn-station-config"
            onClick={onOpenConfig}
            title="Configure OpenWeather API Key and station coordinates"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
