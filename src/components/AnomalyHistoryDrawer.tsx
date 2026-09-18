import React from "react";
import { EnrichedWeatherRecord } from "../types";
import { X, AlertOctagon, ShieldAlert, CheckCircle2 } from "lucide-react";

interface AnomalyHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: EnrichedWeatherRecord[];
}

export const AnomalyHistoryDrawer: React.FC<AnomalyHistoryDrawerProps> = ({
  isOpen,
  onClose,
  anomalies,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="anomaly-history-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="anomaly-history-modal-dialog"
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase">
                Detected Anomaly Log ({anomalies.length})
              </h2>
              <p className="text-xs text-slate-400">
                Isolation Forest ML classification records with parameter attribution
              </p>
            </div>
          </div>
          <button
            id="btn-close-anomaly-history"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {anomalies.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-sm">
              No anomalies detected in the current telemetry window. All readings are nominal.
            </div>
          ) : (
            anomalies.map((item, idx) => (
              <div
                key={idx}
                id={`anomaly-item-${idx}`}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2 hover:border-slate-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        item.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : item.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-orange-500/20 text-orange-300 border-orange-500/40"
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-mono text-xs font-semibold text-white capitalize">
                      {item.anomaly_type}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      [{item.parameter}]
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {item.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-slate-900/50 p-2 rounded">
                  <div>
                    <span className="text-slate-500">Value: </span>
                    <span className="text-rose-400 font-bold">{item.current_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Pattern: </span>
                    <span className="text-slate-300">{item.expected_pattern}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ML Score: </span>
                    <span className="text-white font-bold">{item.anomaly_score.toFixed(3)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  <strong className="text-slate-400 font-mono text-[11px] uppercase">Reason: </strong>
                  {item.anomaly_reason}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
};
