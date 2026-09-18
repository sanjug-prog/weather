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
      name: "Extreme Temperature Spike (48.2 °C)",
      desc: "Simulates sudden thermocouple anomaly exceeding diurnal envelope",
      defaultValue: "48.2",
      type: "temperature anomaly",
    },
    {
      id: "pressure_drop",
      name: "Rapid Barometric Drop (962.4 hPa)",
      desc: "Simulates cyclonic pressure drop or piezoresistive transducer drift",
      defaultValue: "962.4",
      type: "pressure anomaly",
    },
    {
      id: "humidity_plunge",
      name: "Humidity Plunge (8.0 %)",
      desc: "Simulates abrupt psychrometer capacitance failure",
      defaultValue: "8.0",
      type: "humidity anomaly",
    },
    {
      id: "wind_surge",
      name: "Sudden Wind Surge (28.4 m/s)",
      desc: "Simulates intense gust squall outside baseline anemometer distribution",
      defaultValue: "28.4",
      type: "wind anomaly",
    },
    {
      id: "rain_burst",
      name: "Torrential Rain Burst (42.5 mm)",
      desc: "Simulates rapid tipping-bucket accumulation",
      defaultValue: "42.5",
      type: "rainfall anomaly",
    },
    {
      id: "sensor_freeze",
      name: "Transducer Freeze / Malfunction (0.0)",
      desc: "Simulates stuck or disconnected sensor transmitting unvarying zero reading",
      defaultValue: "0.0",
      type: "sensor anomaly",
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="simulate-anomaly-dialog"
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase">
                Inject Synthetic Anomaly
              </h2>
              <p className="text-xs text-slate-400">
                Test and benchmark Isolation Forest detection & attribution live
              </p>
            </div>
          </div>
          <button
            id="btn-close-simulate-modal"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 uppercase block mb-2">
              Select Anomaly Scenario:
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedType === preset.id
                      ? "bg-amber-500/10 border-amber-500/50 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{preset.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {preset.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-sans">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 uppercase block mb-1.5">
              Parameter Value:
            </label>
            <input
              type="number"
              step="any"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              placeholder="e.g. 48.2"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? "Injecting..." : "Inject & Evaluate"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
