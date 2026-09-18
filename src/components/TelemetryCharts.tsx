import React from "react";
import { EnrichedWeatherRecord } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface TelemetryChartsProps {
  history: EnrichedWeatherRecord[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  // Format timestamps to short HH:mm:ss for XAxis
  const chartData = history.map((r) => {
    const timeParts = r.timestamp ? r.timestamp.split(" ") : ["", ""];
    const timeLabel = timeParts[1] ? timeParts[1].substring(0, 5) : r.timestamp;
    return {
      ...r,
      timeLabel,
    };
  });

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EnrichedWeatherRecord & { timeLabel: string };
      return (
        <div className="bg-slate-950 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-mono">
          <div className="text-slate-400 font-semibold mb-1 border-b border-slate-800 pb-1">
            {data.timestamp}
          </div>
          <div className="space-y-0.5">
            <div className="text-orange-400">Temp: {data.temperature.toFixed(1)} °C</div>
            <div className="text-cyan-400">Humidity: {data.humidity.toFixed(0)} %</div>
            <div className="text-purple-400">Pressure: {data.pressure.toFixed(1)} hPa</div>
            <div className="text-emerald-400">Wind: {data.wind_speed.toFixed(1)} m/s</div>
            {data.anomaly && (
              <div className="text-rose-400 font-bold mt-1 pt-1 border-t border-slate-800">
                ⚠ {data.anomaly_type.toUpperCase()} ({data.severity})
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDot = (color: string) => (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.anomaly) {
      return (
        <circle
          key={`dot-${payload.timestamp}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#f43f5e"
          stroke="#ffe4e6"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    return (
      <circle
        key={`dot-${payload.timestamp}`}
        cx={cx}
        cy={cy}
        r={2.5}
        fill={color}
        stroke="#0f172a"
        strokeWidth={1}
      />
    );
  };

  return (
    <section id="charts-grid-section" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Temperature vs Time */}
      <div id="chart-card-temperature" className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Temperature vs Time
          </h3>
          <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
            Metric: °C
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis stroke="#64748b" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                strokeWidth={2}
                dot={renderDot("#f97316")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Humidity vs Time */}
      <div id="chart-card-humidity" className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Humidity vs Time
          </h3>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Metric: % RH
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={renderDot("#06b6d4")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Barometric Pressure vs Time */}
      <div id="chart-card-pressure" className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Pressure vs Time
          </h3>
          <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            Metric: hPa
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis stroke="#64748b" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#a855f7"
                strokeWidth={2}
                dot={renderDot("#a855f7")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Wind Speed vs Time */}
      <div id="chart-card-wind" className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Wind Speed vs Time
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Metric: m/s
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis stroke="#64748b" domain={[0, "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="wind_speed"
                stroke="#10b981"
                strokeWidth={2}
                dot={renderDot("#10b981")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
