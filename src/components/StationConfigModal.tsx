import React, { useState } from "react";
import { X, Settings, Check, Key, Globe, Clock, RotateCcw } from "lucide-react";
import { StationStatus } from "../types";
import { DashboardDataSource } from "../services/dashboardDataSource";

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
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; status: number; message: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const data = await DashboardDataSource.verifyKey(
        apiKey.trim() || undefined,
        parseFloat(latitude),
        parseFloat(longitude)
      );
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ valid: false, status: 0, message: `Verification error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearKey = async () => {
    setApiKey("");
    setTestResult(null);
    setIsSaving(true);
    try {
      await onSaveConfig({
        apiKey: "",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        collectionIntervalSec: parseInt(intervalSec, 10),
      });
      setMessage("API key cleared. Reverted to continuous high-fidelity AWS telemetry baseline.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="station-config-dialog"
        className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-900"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weather Station Settings
              </h2>
              <p className="text-xs text-slate-500">
                Set your weather location, API key, and check interval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {message && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg font-medium">
              {message}
            </div>
          )}

          {/* OpenWeather API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>OpenWeather API Key (Optional):</span>
              </label>
              {status?.api_has_key && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  disabled={isSaving}
                  className="text-xs text-slate-500 hover:text-rose-600 transition underline cursor-pointer"
                >
                  Clear Key
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={
                  status?.api_has_key
                    ? `Current Key: ${status.api_key_masked || "Configured"} (paste new key to change)`
                    : "Paste OpenWeather key here (leave blank for built-in weather data)"
                }
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {isTesting ? "Testing..." : "Test Key"}
              </button>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`mt-2 p-3 rounded-lg text-xs border ${
                  testResult.valid
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : testResult.status === 401
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span>Status: {testResult.valid ? "Connected successfully" : "Needs attention"}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{testResult.message}</p>
              </div>
            )}

            <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Current data source:{" "}
                <strong
                  className={
                    status?.api_connected
                      ? "text-emerald-700 font-bold"
                      : status?.api_status_code === 401
                      ? "text-amber-700 font-bold"
                      : "text-blue-700 font-bold"
                  }
                >
                  {status?.api_status_text}
                </strong>
              </span>
            </div>

            {status?.api_status_code === 401 && !testResult && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
                <span className="font-bold text-amber-800">Note about new OpenWeather keys: </span>
                New API keys can take from 15 minutes to 2 hours to activate on OpenWeather servers.
                In the meantime, the app automatically creates and saves realistic weather data so all charts and anomaly detection work seamlessly.
              </div>
            )}
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Station Latitude:</span>
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Station Longitude:</span>
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* Collection Interval */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>How often to check (in Seconds):</span>
            </label>
            <input
              type="number"
              min="10"
              max="3600"
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Default is every 60 seconds</p>
          </div>

          {/* Reset button */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isResetting ? "Resetting..." : "Reset Weather Data File"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
