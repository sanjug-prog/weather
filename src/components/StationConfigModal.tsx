import React, { useState } from "react";
import { X, Settings, Check, Key, Globe, Clock, RotateCcw } from "lucide-react";
import { StationStatus } from "../types";

interface StationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: StationStatus | null;
  onSaveConfig: (config: { apiKey?: string; latitude?: number; longitude?: number; collectionIntervalSec?: number }) => Promise<void>;
  onResetCsv: () => Promise<void>;
}

export const StationConfigModal: React.FC<StationConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  onSaveConfig,
  onResetCsv,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [latitude, setLatitude] = useState<string>(status?.station_coordinates.latitude.toString() || "13.0827");
  const [longitude, setLongitude] = useState<string>(status?.station_coordinates.longitude.toString() || "80.2707");
  const [intervalSec, setIntervalSec] = useState<string>(status?.collection_interval_sec.toString() || "60");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await onSaveConfig({
        apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        collectionIntervalSec: parseInt(intervalSec, 10),
      });
      setMessage("Station configuration updated successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset weather_data.csv back to initial nominal baseline?")) return;
    setIsResetting(true);
    try {
      await onResetCsv();
      setMessage("CSV reset to clean nominal baseline.");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      id="station-config-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="station-config-dialog"
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase">
                Station & OpenWeather Config
              </h2>
              <p className="text-xs text-slate-400">
                Configure live API integration and Automatic Weather Station coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {message && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs rounded-lg font-mono">
              {message}
            </div>
          )}

          {/* OpenWeather API Key */}
          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5 mb-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span>OpenWeather API Key:</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste 32-character key (optional, leave blank to use active baseline)"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Current API status:{" "}
              <strong className={status?.api_connected ? "text-emerald-400" : "text-amber-400"}>
                {status?.api_status_text}
              </strong>
            </p>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Station Latitude:</span>
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Station Longitude:</span>
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Collection Interval */}
          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Collection Interval (Seconds):</span>
            </label>
            <input
              type="number"
              min="10"
              max="3600"
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">Default is 60s as specified in deliverables</p>
          </div>

          {/* Reset button */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isResetting ? "Resetting..." : "Reset Baseline CSV"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Config"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
