import React from "react";
import { EnrichedWeatherRecord } from "../types";
import { Thermometer, Droplets, Gauge, Wind, CloudRain, Eye, Compass, Cloud } from "lucide-react";

interface WeatherMetricsGridProps {
  reading: EnrichedWeatherRecord | null;
}

export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({ reading }) => {
  if (!reading) return null;

  return (
    <section id="metrics-grid-section" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Temperature */}
      <div
        id="card-metric-temperature"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Temperature</span>
          <Thermometer className="w-4 h-4 text-orange-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-temp" className="text-2xl font-mono font-bold text-white tracking-tight">
            {reading.temperature.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">°C</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Feels: {reading.feels_like.toFixed(1)}°C</span>
          <span className="text-[10px] text-slate-500 font-mono">AWS Probe</span>
        </p>
      </div>

      {/* 2. Humidity */}
      <div
        id="card-metric-humidity"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Humidity</span>
          <Droplets className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-humidity" className="text-2xl font-mono font-bold text-white tracking-tight">
            {reading.humidity.toFixed(0)}
          </span>
          <span className="text-xs font-mono text-slate-400">%</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Relative RH</span>
          <span className="text-[10px] text-slate-500 font-mono">Capacitive</span>
        </p>
      </div>

      {/* 3. Barometric Pressure */}
      <div
        id="card-metric-pressure"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Pressure</span>
          <Gauge className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-pressure" className="text-2xl font-mono font-bold text-white tracking-tight">
            {reading.pressure.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">hPa</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Barometric QNH</span>
          <span className="text-[10px] text-slate-500 font-mono">Piezoresistive</span>
        </p>
      </div>

      {/* 4. Wind Speed */}
      <div
        id="card-metric-wind"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Wind Speed</span>
          <Wind className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-wind" className="text-2xl font-mono font-bold text-white tracking-tight">
            {reading.wind_speed.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">m/s</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Bearing: {reading.wind_direction.toFixed(0)}°</span>
          <span className="text-[10px] text-slate-500 font-mono">Sonic Anemometer</span>
        </p>
      </div>

      {/* 5. Rainfall */}
      <div
        id="card-metric-rainfall"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Rainfall</span>
          <CloudRain className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-rain" className="text-2xl font-mono font-bold text-white tracking-tight">
            {reading.rainfall.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">mm</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Accumulation (1h)</span>
          <span className="text-[10px] text-slate-500 font-mono">Tipping Bucket</span>
        </p>
      </div>

      {/* 6. Visibility */}
      <div
        id="card-metric-visibility"
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group hover:border-slate-700 transition"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Visibility</span>
          <Eye className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-visibility" className="text-2xl font-mono font-bold text-white tracking-tight">
            {(reading.visibility / 1000).toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">km</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span className="truncate">{reading.weather_condition || "Clear"} ({reading.cloudiness}%)</span>
          <span className="text-[10px] text-slate-500 font-mono">Optical</span>
        </p>
      </div>
    </section>
  );
};
