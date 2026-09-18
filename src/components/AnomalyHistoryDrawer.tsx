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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="anomaly-history-modal-dialog"
        className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Unusual Weather Readings History ({anomalies.length})
              </h2>
              <p className="text-xs text-slate-500">
                Log of unusual events and sensor flags found by the AI
              </p>
            </div>
          </div>
          <button
            id="btn-close-anomaly-history"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {anomalies.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No unusual weather readings recorded. All sensors are reporting normal numbers.
            </div>
          ) : (
            anomalies.map((item, idx) => (
              <div
                key={idx}
                id={`anomaly-item-${idx}`}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 hover:border-slate-300 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        item.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : item.severity === "HIGH"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-orange-100 text-orange-800 border-orange-200"
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {item.anomaly_type}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      ({item.parameter})
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {item.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white border border-slate-200 p-2.5 rounded-md shadow-2xs">
                  <div>
                    <span className="text-slate-500">Recorded Value: </span>
                    <span className="text-rose-600 font-bold">{item.current_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-slate-800 font-medium">{item.expected_pattern}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">AI Confidence: </span>
                    <span className="text-slate-900 font-bold">{item.anomaly_score.toFixed(3)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  <strong className="text-slate-900 font-semibold">What happened: </strong>
                  {item.anomaly_reason}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
