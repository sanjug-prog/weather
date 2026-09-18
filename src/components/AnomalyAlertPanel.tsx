import React from "react";
import { EnrichedWeatherRecord } from "../types";
import { AlertOctagon, CheckCircle, Flame, Gauge, Info, Wind, ShieldAlert, ArrowRight, Activity } from "lucide-react";

interface AnomalyAlertPanelProps {
  currentReading: EnrichedWeatherRecord | null;
  onOpenHistory: () => void;
  anomalyCount: number;
}

export const AnomalyAlertPanel: React.FC<AnomalyAlertPanelProps> = ({
  currentReading,
  onOpenHistory,
  anomalyCount,
}) => {
  if (!currentReading) {
    return (
      <div id="anomaly-panel-loading" className="bg-white border border-slate-200 rounded-xl p-5 text-center text-slate-600 text-sm shadow-xs animate-pulse">
        Checking weather patterns with AI...
      </div>
    );
  }

  const isAnomaly = currentReading.anomaly;
  const severity = currentReading.severity || "NORMAL";

  const getSeverityBadge = () => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
      case "HIGH":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "MEDIUM":
        return "bg-orange-100 text-orange-900 border-orange-300";
      case "LOW":
        return "bg-yellow-100 text-yellow-900 border-yellow-300";
      default:
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
    }
  };

  return (
    <section
      id="anomaly-panel-container"
      className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-xs ${
        isAnomaly
          ? "bg-white border-rose-300 ring-2 ring-rose-100"
          : "bg-white border-slate-200"
      }`}
    >
      {/* Header Bar */}
      <div
        id="anomaly-panel-header"
        className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
          isAnomaly
            ? "bg-rose-50 border-rose-200 text-rose-950"
            : "bg-emerald-50/80 border-emerald-100 text-emerald-950"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAnomaly ? (
            <div className="p-1.5 rounded-md bg-rose-100 text-rose-700 animate-bounce">
              <AlertOctagon className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span id="anomaly-panel-title" className="font-bold text-sm tracking-wide text-slate-900">
                {isAnomaly ? "WARNING: UNUSUAL WEATHER DETECTED!" : "ALL WEATHER READINGS LOOK NORMAL"}
              </span>
              <span
                id="anomaly-severity-badge"
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge()}`}
              >
                {severity} LEVEL
              </span>
            </div>
            <span id="anomaly-type-label" className="text-xs text-slate-600 capitalize">
              Problem Type: {currentReading.anomaly_type !== "none" ? currentReading.anomaly_type : "None (All sensors within expected range)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span id="anomaly-timestamp-display" className="text-xs text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200 font-medium">
            Reading time: {currentReading.timestamp}
          </span>
          <button
            id="btn-view-anomaly-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-100 px-3 py-1.5 rounded transition cursor-pointer border border-slate-300 shadow-xs"
          >
            <span>Alert History ({anomalyCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div id="anomaly-panel-body" className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Parameter */}
          <div id="anomaly-meta-parameter" className={`rounded-lg p-3.5 border ${isAnomaly ? "bg-rose-50/30 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Weather Sensor
            </span>
            <span className="text-base font-bold text-slate-900 mt-1 block truncate">
              {currentReading.parameter || "All Sensors"}
            </span>
          </div>

          {/* Current Value */}
          <div id="anomaly-meta-value" className={`rounded-lg p-3.5 border ${isAnomaly ? "bg-rose-50/30 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Current Reading
            </span>
            <span className={`text-base font-bold mt-1 block truncate ${isAnomaly ? "text-rose-600" : "text-emerald-700"}`}>
              {currentReading.current_value}
            </span>
          </div>

          {/* Expected / Recent Pattern */}
          <div id="anomaly-meta-expected" className={`rounded-lg p-3.5 border ${isAnomaly ? "bg-rose-50/30 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Normal Expected Value
            </span>
            <span className="text-xs font-medium text-slate-700 mt-1 block truncate">
              {currentReading.expected_pattern}
            </span>
          </div>

          {/* Anomaly Score */}
          <div id="anomaly-meta-score" className={`rounded-lg p-3.5 border ${isAnomaly ? "bg-rose-50/30 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Unusualness Score
              </span>
              <span className="text-[11px] font-medium text-slate-500">Alert at &gt; 0.58</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-base font-bold ${currentReading.anomaly_score > 0.65 ? "text-rose-600" : "text-slate-900"}`}>
                {currentReading.anomaly_score.toFixed(2)}
              </span>
              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    currentReading.anomaly_score > 0.65
                      ? "bg-rose-500"
                      : currentReading.anomaly_score > 0.55
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, currentReading.anomaly_score * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Reason / Root Cause Explanation */}
        <div
          id="anomaly-reason-container"
          className={`rounded-lg p-3.5 flex items-start gap-3 border ${
            isAnomaly
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <Info className={`w-4 h-4 mt-0.5 shrink-0 ${isAnomaly ? "text-rose-600" : "text-blue-600"}`} />
          <div className="text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-[11px] mr-2 text-slate-900">
              Why this was checked:
            </span>
            <span id="anomaly-reason-text" className="font-medium">{currentReading.anomaly_reason}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
