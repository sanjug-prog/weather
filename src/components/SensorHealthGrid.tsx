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
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        bar: "bg-emerald-500",
        text: "text-emerald-400",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      };
    } else if (score >= 70) {
      return {
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        bar: "bg-amber-500",
        text: "text-amber-400",
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      };
    } else {
      return {
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        bar: "bg-rose-500",
        text: "text-rose-400",
        icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
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
    <section id="sensor-health-section" className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 id="health-panel-title" className="text-sm font-mono font-bold uppercase tracking-wider text-white">
            Sensor Analytical Health Index (0–100)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical variance & dynamic drift detection across station transducer channels
          </p>
        </div>

        {/* Legend indicator */}
        <div id="health-legend-block" className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 90-100: Healthy
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> 70-89: Warning
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> 0-69: Needs attention
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
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 capitalize">
                    {key} Sensor
                  </span>
                  {styling.icon}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-mono font-bold text-white tracking-tight">
                    {item.score}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">/100</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border ${styling.badge}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${styling.bar}`}
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 font-mono truncate" title={item.note}>
                {item.note}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mandatory Analytical Disclaimer */}
      <div
        id="health-disclaimer-notice"
        className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400 italic"
      >
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          <strong>Notice:</strong> {healthData.disclaimer || "Analytical indicator and not a physical inspection of the sensors."}
        </span>
      </div>
    </section>
  );
};
