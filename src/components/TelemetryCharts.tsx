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

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EnrichedWeatherRecord & { timeLabel: string };
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md text-xs">
          <div className="text-slate-500 font-semibold mb-1.5 border-b border-slate-100 pb-1">
            Time: {data.timestamp}
          </div>
          <div className="space-y-1">
            <div className="text-rose-600 font-medium">Temperature: <span className="font-bold">{data.temperature.toFixed(1)} °C</span></div>
            <div className="text-sky-600 font-medium">Humidity: <span className="font-bold">{data.humidity.toFixed(0)} %</span></div>
            <div className="text-emerald-700 font-medium">Air Pressure: <span className="font-bold">{data.pressure.toFixed(1)} hPa</span></div>
            <div className="text-purple-600 font-medium">Wind Speed: <span className="font-bold">{data.wind_speed.toFixed(1)} m/s</span></div>
            {data.anomaly && (
              <div className="text-rose-800 font-bold mt-1.5 pt-1.5 border-t border-slate-100 bg-rose-50 px-2 py-1 rounded">
                ⚠ Unusual reading ({data.severity || "Flagged"})
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
          r={5.5}
          fill="#dc2626"
          stroke="#ffffff"
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
        r={3}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <section id="charts-grid-section" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Temperature vs Time - Vibrant Crimson Red */}
      <div id="chart-card-temperature" className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Temperature Trend
            </h3>
            <p className="text-xs text-slate-500">Air temperature recordings over time</p>
          </div>
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            °C (Celsius)
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis stroke="#94a3b8" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={renderDot("#e11d48")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Humidity vs Time - Vibrant Ocean Cerulean Blue */}
      <div id="chart-card-humidity" className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Humidity Trend
            </h3>
            <p className="text-xs text-slate-500">Air moisture level percentage</p>
          </div>
          <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            % (Moisture)
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={renderDot("#0284c7")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Barometric Pressure vs Time - Forest Emerald Green */}
      <div id="chart-card-pressure" className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Air Pressure Trend
            </h3>
            <p className="text-xs text-slate-500">Barometric atmospheric pressure</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            hPa (Pressure)
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis stroke="#94a3b8" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#059669"
                strokeWidth={2.5}
                dot={renderDot("#059669")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Wind Speed vs Time - Vibrant Royal Purple */}
      <div id="chart-card-wind" className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Wind Speed Trend
            </h3>
            <p className="text-xs text-slate-500">Wind velocity measurements</p>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            m/s (Meters / Sec)
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis stroke="#94a3b8" domain={[0, "auto"]} tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="wind_speed"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={renderDot("#7c3aed")}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
