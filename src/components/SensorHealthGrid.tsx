import React from "react";
import { SensorHealthData } from "../types";
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface SensorHealthGridProps {
  healthData: SensorHealthData | null;
}

export const SensorHealthGrid: React.FC<SensorHealthGridProps> = ({ healthData }) => {
  if (!healthData || !healthData.metrics) return null;

  const metrics = healthData.metrics;

  const getStatusBadge = (status: "Healthy" | "Warning" | "Needs attention", score: number) => {
    if (score >= 90) {
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        bar: "bg-emerald-500",
        text: "text-emerald-700",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      };
    } else if (score >= 70) {
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        bar: "bg-amber-500",
        text: "text-amber-700",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      };
    } else {
      return {
        badge: "bg-rose-100 text-rose-800 border-rose-200",
        bar: "bg-rose-500",
        text: "text-rose-700",
        icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
      };
    }
  };

  const sensorKeys: Array<keyof typeof metrics> = [
    "temperature",
    "humidity",
    "pressure",
    "wind",
    "rainfall",
  ];

  return (
    <section id="sensor-health-section" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
        <div>
          <h2 id="health-panel-title" className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Sensor Health Scores (0 to 100)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Checks if sensors are working normally or getting stuck/erratic
          </p>
        </div>

        {/* Legend indicator */}
        <div id="health-legend-block" className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 90-100: Healthy
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> 70-89: Warning
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> 0-69: Check Soon
          </span>
        </div>
      </div>

      {/* Health Cards Grid */}
      <div id="health-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {sensorKeys.map((key) => {
          const item = metrics[key];
          if (!item) return null;
          const styling = getStatusBadge(item.status, item.score);

          return (
            <div
              key={key}
              id={`sensor-health-card-${key}`}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 capitalize">
                    {key} Sensor
                  </span>
                  {styling.icon}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {item.score}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">/100</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${styling.badge}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${styling.bar}`}
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-2.5 font-medium truncate" title={item.note}>
                {item.note}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mandatory Analytical Disclaimer */}
      <div
        id="health-disclaimer-notice"
        className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500"
      >
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          <strong>Notice:</strong> {healthData.disclaimer || "Estimated score based on data patterns, not a physical hardware inspection."}
        </span>
      </div>
    </section>
  );
};
