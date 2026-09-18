import React, { useState } from "react";
import { X, AlertTriangle, Sparkles, Send } from "lucide-react";

interface SimulateAnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (type: string, customValue?: number) => Promise<void>;
}

export const SimulateAnomalyModal: React.FC<SimulateAnomalyModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [selectedType, setSelectedType] = useState<string>("heat_spike");
  const [customVal, setCustomVal] = useState<string>("48.2");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const presets = [
    {
      id: "heat_spike",
      name: "Extreme Heat Wave (48.2 °C)",
      desc: "Simulates sudden intense heat wave or overheating sensor",
      defaultValue: "48.2",
      type: "High Temperature",
    },
    {
      id: "pressure_drop",
      name: "Sudden Air Pressure Drop (962.4 hPa)",
      desc: "Simulates sudden storm pressure drop or barometer fault",
      defaultValue: "962.4",
      type: "Low Pressure",
    },
    {
      id: "humidity_plunge",
      name: "Extremely Low Humidity (8.0 %)",
      desc: "Simulates extreme dry air or humidity sensor fault",
      defaultValue: "8.0",
      type: "Low Moisture",
    },
    {
      id: "wind_surge",
      name: "Sudden Strong Wind Gust (28.4 m/s)",
      desc: "Simulates sudden severe wind gust or storm wind",
      defaultValue: "28.4",
      type: "High Wind",
    },
    {
      id: "rain_burst",
      name: "Heavy Rain Burst (42.5 mm)",
      desc: "Simulates sudden extreme rainfall accumulation",
      defaultValue: "42.5",
      type: "High Rainfall",
    },
    {
      id: "sensor_freeze",
      name: "Sensor Glitch / Offline (0.0)",
      desc: "Simulates a sensor that lost connection or got stuck at zero",
      defaultValue: "0.0",
      type: "Sensor Error",
    },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedType(preset.id);
    setCustomVal(preset.defaultValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSimulate(selectedType, customVal ? parseFloat(customVal) : undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="simulate-anomaly-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="simulate-anomaly-dialog"
        className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-900"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Test Anomaly Detection
              </h2>
              <p className="text-xs text-slate-500">
                Send a sample unusual weather event to test how the AI responds
              </p>
            </div>
          </div>
          <button
            id="btn-close-simulate-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Choose Test Scenario:
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedType === preset.id
                      ? "bg-amber-50 border-amber-400 text-slate-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900">{preset.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {preset.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-normal">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Test Value:
            </label>
            <input
              type="number"
              step="any"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
              placeholder="e.g. 48.2"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? "Sending..." : "Send Test Reading"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
