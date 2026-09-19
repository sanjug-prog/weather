import React from "react";
import { StationStatus } from "../types";
import {
  Radio,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Activity,
  Calendar,
  Map,
} from "lucide-react";

export type ActiveDashboardView = "monitor" | "weekly" | "map";

interface HeaderProps {
  status: StationStatus | null;
  activeView: ActiveDashboardView;
  onViewChange: (view: ActiveDashboardView) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSimulate: () => void;
  onOpenCsv: () => void;
  onOpenConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  activeView,
  onViewChange,
  onRefresh,
  isRefreshing,
  onOpenSimulate,
  onOpenCsv,
  onOpenConfig,
}) => {
  return (
    <header id="header-main" className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30 px-4 py-3 sm:px-6 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand identity */}
        <div id="header-brand-block" className="flex items-center gap-3.5">
          <div id="header-brand-badge" className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg tracking-wider shadow-sm">
            WG
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 id="header-title" className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                WeatherGuard AI
              </h1>
              <span id="header-version-tag" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                SIH26073
              </span>
            </div>
            <p id="header-subtitle" className="text-xs text-slate-600 font-medium">
              AWS Anomaly Detection, 15-Day Temporal Trends & Global Station Map
            </p>
          </div>
        </div>

        {/* Center: Main View Navigation Switcher */}
        <nav id="header-view-nav" aria-label="Main View Navigation" className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            id="tab-station-monitor"
            onClick={() => onViewChange("monitor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "monitor"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AWS Telemetry</span>
          </button>
          <button
            type="button"
            id="tab-weekly-forecast"
            onClick={() => onViewChange("weekly")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "weekly"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>7-Day History & Forecast</span>
          </button>
          <button
            type="button"
            id="tab-global-map"
            onClick={() => onViewChange("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "map"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>World Station Map</span>
          </button>
        </nav>

        {/* Action Controls & Telemetry Meta */}
        <div id="header-controls-block" className="flex flex-wrap items-center gap-2 text-xs">
          {/* Station location badge */}
          <div
            id="header-station-location"
            title={`Station Location: 11° 16' 19.8" N, 77° 36' 14.4" E (${status?.station_coordinates.latitude.toFixed(4)}°N, ${status?.station_coordinates.longitude.toFixed(4)}°E)`}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              {status?.station_coordinates.latitude.toFixed(4)}°N, {status?.station_coordinates.longitude.toFixed(4)}°E
            </span>
          </div>

          {/* Action Buttons */}
          <button
            id="btn-collect-telemetry"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Fetch new weather reading right now"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Updating..." : "Update"}</span>
          </button>

          <button
            id="btn-simulate-anomaly"
            onClick={onOpenSimulate}
            title="Inject a test weather reading to evaluate the ML detector"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium transition cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Test Anomaly</span>
          </button>

          <button
            id="btn-view-raw-csv"
            onClick={onOpenCsv}
            title="View saved weather data file (weather_data.csv)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>

          <button
            id="btn-station-config"
            onClick={onOpenConfig}
            title="Settings: API key and station location"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
