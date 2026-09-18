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
      <div id="anomaly-panel-loading" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400 font-mono text-sm animate-pulse">
        Initializing AWS ML telemetry analysis...
      </div>
    );
  }

  const isAnomaly = currentReading.anomaly;
  const severity = currentReading.severity || "NORMAL";

  const getSeverityBadge = () => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "MEDIUM":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "LOW":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <section
      id="anomaly-panel-container"
      className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isAnomaly
          ? "bg-rose-950/20 border-rose-500/50 shadow-rose-950/30"
          : "bg-slate-900/90 border-slate-800 shadow-black/20"
      }`}
    >
      {/* Header Bar */}
      <div
        id="anomaly-panel-header"
        className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
          isAnomaly
            ? "bg-rose-900/30 border-rose-500/30 text-rose-200"
            : "bg-slate-800/40 border-slate-800 text-slate-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAnomaly ? (
            <div className="p-1.5 rounded-md bg-rose-500/20 text-rose-400 animate-bounce">
              <AlertOctagon className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span id="anomaly-panel-title" className="font-mono font-bold text-sm tracking-wide">
                {isAnomaly ? "⚠ ANOMALY DETECTED" : "NOMINAL TELEMETRY STATUS"}
              </span>
              <span
                id="anomaly-severity-badge"
                className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge()}`}
              >
                {severity} SEVERITY
              </span>
            </div>
            <span id="anomaly-type-label" className="text-[11px] text-slate-400 capitalize">
              Classification: {currentReading.anomaly_type !== "none" ? currentReading.anomaly_type : "Nominal operational envelope"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span id="anomaly-timestamp-display" className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
            Observation: {currentReading.timestamp}
          </span>
          <button
            id="btn-view-anomaly-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition cursor-pointer border border-slate-700"
          >
            <span>History ({anomalyCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div id="anomaly-panel-body" className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Parameter */}
          <div id="anomaly-meta-parameter" className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Parameter / Sensor
            </span>
            <span className="text-base font-semibold text-white mt-1 block truncate">
              {currentReading.parameter || "All Systems"}
            </span>
          </div>

          {/* Current Value */}
          <div id="anomaly-meta-value" className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Current Observation
            </span>
            <span className={`text-base font-mono font-bold mt-1 block truncate ${isAnomaly ? "text-rose-400" : "text-emerald-400"}`}>
              {currentReading.current_value}
            </span>
          </div>

          {/* Expected / Recent Pattern */}
          <div id="anomaly-meta-expected" className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Expected / Recent Pattern
            </span>
            <span className="text-xs font-mono text-slate-300 mt-1 block truncate">
              {currentReading.expected_pattern}
            </span>
          </div>

          {/* Anomaly Score */}
          <div id="anomaly-meta-score" className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Isolation Forest Score
              </span>
              <span className="text-[11px] font-mono text-slate-500">Threshold: 0.58</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-base font-mono font-bold ${currentReading.anomaly_score > 0.65 ? "text-rose-400" : "text-slate-300"}`}>
                {currentReading.anomaly_score.toFixed(3)}
              </span>
              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
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
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-slate-800/50 border-slate-800 text-slate-300"
          }`}
        >
          <Info className={`w-4 h-4 mt-0.5 shrink-0 ${isAnomaly ? "text-rose-400" : "text-blue-400"}`} />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold uppercase tracking-wider text-[11px] mr-2">
              Reason / Diagnostic:
            </span>
            <span id="anomaly-reason-text">{currentReading.anomaly_reason}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
