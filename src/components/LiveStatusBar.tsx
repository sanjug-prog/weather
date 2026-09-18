import React from "react";
import { StationStatus } from "../types";
import { Database, Cpu, Wifi, Clock, CheckCircle2 } from "lucide-react";

interface LiveStatusBarProps {
  status: StationStatus | null;
  lastUpdated: string | null;
}

export const LiveStatusBar: React.FC<LiveStatusBarProps> = ({ status, lastUpdated }) => {
  return (
    <section id="status-bar-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Weather Source */}
      <div
        id="status-card-api"
        className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-start gap-3 shadow-xs"
      >
        <div
          id="status-icon-api"
          className={`p-2 rounded-md ${
            status?.api_connected
              ? "bg-emerald-50 text-emerald-700"
              : status?.api_status_code === 401
              ? "bg-amber-50 text-amber-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <Wifi className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Weather Source
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                status?.api_connected
                  ? "bg-emerald-100 text-emerald-800"
                  : status?.api_status_code === 401
                  ? "bg-amber-100 text-amber-800"
                  : status?.api_status_code === 429
                  ? "bg-orange-100 text-orange-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {status?.api_connected
                ? "LIVE ONLINE"
                : status?.api_status_code === 401
                ? "KEY ACTIVATING"
                : status?.api_status_code === 429
                ? "LIMIT REACHED"
                : "SIMULATED"}
            </span>
          </div>
          <div id="status-val-api" className="text-sm font-bold text-slate-900 mt-1 truncate" title={status?.api_status_text}>
            {status?.api_connected
              ? "Live OpenWeather Connected"
              : status?.api_status_code === 401
              ? "Activating Key • Simulated Weather Active"
              : status?.api_status_text || "Simulated Weather Active"}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {status?.api_status_code === 401
              ? "Key is activating on OpenWeather servers"
              : status?.api_connected
              ? "Live real-world weather feed"
              : "Using realistic local backup weather"}
          </p>
        </div>
      </div>

      {/* 2. Data Saving Active */}
      <div
        id="status-card-collector"
        className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-start gap-3 shadow-xs"
      >
        <div id="status-icon-collector" className="p-2 rounded-md bg-emerald-50 text-emerald-700">
          <Database className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Data Saving
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              AUTOMATIC
            </span>
          </div>
          <div id="status-val-collector" className="text-sm font-bold text-slate-900 mt-1">
            Saves every {status?.collection_interval_sec || 60} seconds
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {status?.total_records || 0} readings stored in <code className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-medium">weather_data.csv</code>
          </p>
        </div>
      </div>

      {/* 3. AI Problem Detector */}
      <div
        id="status-card-model"
        className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-start gap-3 shadow-xs"
      >
        <div id="status-icon-model" className="p-2 rounded-md bg-purple-50 text-purple-700">
          <Cpu className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              AI Problem Detector
            </span>
            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
              WATCHING
            </span>
          </div>
          <div id="status-val-model" className="text-sm font-bold text-slate-900 mt-1 truncate">
            Ready & Watching Weather
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Detects sudden jumps, broken sensors & spikes
          </p>
        </div>
      </div>

      {/* 4. Latest Reading Time */}
      <div
        id="status-card-timestamp"
        className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-start gap-3 shadow-xs"
      >
        <div id="status-icon-timestamp" className="p-2 rounded-md bg-slate-100 text-slate-700">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Last Reading
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div id="status-val-timestamp" className="text-sm font-bold text-slate-900 mt-1 truncate">
            {lastUpdated || "Updating..."}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">Checked and recorded on schedule</p>
        </div>
      </div>
    </section>
  );
};
