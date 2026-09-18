import React from "react";
import { StationStatus } from "../types";
import { Activity, Database, Cpu, Wifi, Clock, CheckCircle2 } from "lucide-react";

interface LiveStatusBarProps {
  status: StationStatus | null;
  lastUpdated: string | null;
}

export const LiveStatusBar: React.FC<LiveStatusBarProps> = ({ status, lastUpdated }) => {
  return (
    <section id="status-bar-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. API Connected */}
      <div
        id="status-card-api"
        className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-start gap-3 relative overflow-hidden"
      >
        <div
          id="status-icon-api"
          className={`p-2 rounded-md ${
            status?.api_connected
              ? "bg-emerald-500/10 text-emerald-400"
              : status?.api_status_code === 401
              ? "bg-amber-500/10 text-amber-400"
              : "bg-blue-500/10 text-blue-400"
          }`}
        >
          <Wifi className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              API Connection
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                status?.api_connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : status?.api_status_code === 401
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : status?.api_status_code === 429
                  ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
            >
              {status?.api_connected
                ? "LIVE 200 OK"
                : status?.api_status_code === 401
                ? "ACTIVATING (401)"
                : status?.api_status_code === 429
                ? "RATE LIMIT (429)"
                : "BASELINE ACTIVE"}
            </span>
          </div>
          <div id="status-val-api" className="text-sm font-semibold text-white mt-1 truncate" title={status?.api_status_text}>
            {status?.api_status_text || "Checking OpenWeather..."}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {status?.api_status_code === 401
              ? "Propagating on OpenWeather • AWS Baseline Active"
              : "OpenWeather API v2.5 Telemetry"}
          </p>
        </div>
      </div>

      {/* 2. Data Collection Active */}
      <div
        id="status-card-collector"
        className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-start gap-3 relative overflow-hidden"
      >
        <div id="status-icon-collector" className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
          <Database className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Data Collection
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ACTIVE
            </span>
          </div>
          <div id="status-val-collector" className="text-sm font-semibold text-white mt-1">
            CSV Append Loop ({status?.collection_interval_sec || 60}s)
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Store: <code className="text-slate-400">data/weather_data.csv</code> ({status?.total_records || 0} rows)
          </p>
        </div>
      </div>

      {/* 3. ML Model Status */}
      <div
        id="status-card-model"
        className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-start gap-3 relative overflow-hidden"
      >
        <div id="status-icon-model" className="p-2 rounded-md bg-purple-500/10 text-purple-400">
          <Cpu className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              ML Model Status
            </span>
            <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
              ONLINE
            </span>
          </div>
          <div id="status-val-model" className="text-sm font-semibold text-white mt-1 truncate">
            {status?.ml_model_status || "Isolation Forest (100 iTrees)"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Contamination: 0.08 • Multimodal Ensembling</p>
        </div>
      </div>

      {/* 4. Latest Telemetry Clock */}
      <div
        id="status-card-timestamp"
        className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-start gap-3 relative overflow-hidden"
      >
        <div id="status-icon-timestamp" className="p-2 rounded-md bg-slate-800 text-slate-300">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Latest Observation
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div id="status-val-timestamp" className="text-sm font-mono font-semibold text-white mt-1 truncate">
            {lastUpdated || "Syncing..."}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Automated timestamped logging</p>
        </div>
      </div>
    </section>
  );
};
