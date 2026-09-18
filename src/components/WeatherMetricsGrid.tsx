import React from "react";
import { EnrichedWeatherRecord } from "../types";
import { Thermometer, Droplets, Gauge, Wind, CloudRain, Eye, Compass, Cloud } from "lucide-react";

interface WeatherMetricsGridProps {
  reading: EnrichedWeatherRecord | null;
}

export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({ reading }) => {
  if (!reading) return null;

  return (
    <section id="metrics-grid-section" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Temperature */}
      <div
        id="card-metric-temperature"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Temperature</span>
          <Thermometer className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-temp" className="text-2xl font-bold text-slate-900 tracking-tight">
            {reading.temperature.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">°C</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span>Feels like {reading.feels_like.toFixed(1)}°C</span>
        </div>
      </div>

      {/* 2. Humidity */}
      <div
        id="card-metric-humidity"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Humidity</span>
          <Droplets className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-humidity" className="text-2xl font-bold text-slate-900 tracking-tight">
            {reading.humidity.toFixed(0)}
          </span>
          <span className="text-sm font-semibold text-slate-500">%</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span>Air moisture</span>
        </div>
      </div>

      {/* 3. Barometric Pressure */}
      <div
        id="card-metric-pressure"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Air Pressure</span>
          <Gauge className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-pressure" className="text-2xl font-bold text-slate-900 tracking-tight">
            {reading.pressure.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">hPa</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span>Barometric level</span>
        </div>
      </div>

      {/* 4. Wind Speed */}
      <div
        id="card-metric-wind"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Wind Speed</span>
          <Wind className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-wind" className="text-2xl font-bold text-slate-900 tracking-tight">
            {reading.wind_speed.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">m/s</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span>Direction: {reading.wind_direction.toFixed(0)}°</span>
        </div>
      </div>

      {/* 5. Rainfall */}
      <div
        id="card-metric-rainfall"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Rainfall</span>
          <CloudRain className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-rain" className="text-2xl font-bold text-slate-900 tracking-tight">
            {reading.rainfall.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">mm</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span>Past 1 hour</span>
        </div>
      </div>

      {/* 6. Visibility */}
      <div
        id="card-metric-visibility"
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Visibility</span>
          <Eye className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex items-baseline gap-1">
          <span id="metric-val-visibility" className="text-2xl font-bold text-slate-900 tracking-tight">
            {(reading.visibility / 1000).toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">km</span>
        </div>
        <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between font-medium">
          <span className="truncate">{reading.weather_condition || "Clear"} ({reading.cloudiness}% clouds)</span>
        </div>
      </div>
    </section>
  );
};
