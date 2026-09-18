import React, { useState, useEffect } from "react";
import { X, FileSpreadsheet, Download, RefreshCw } from "lucide-react";

interface RawCsvViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RawCsvViewerModal: React.FC<RawCsvViewerModalProps> = ({ isOpen, onClose }) => {
  const [csvText, setCsvText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCsv = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/raw-csv");
      if (res.ok) {
        const text = await res.text();
        setCsvText(text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCsv();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const downloadCsv = () => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `weather_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lines = csvText.trim().split("\n");
  const headers = lines.length > 0 ? lines[0].split(",") : [];
  const rows = lines.length > 1 ? lines.slice(1) : [];

  return (
    <div
      id="raw-csv-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="raw-csv-dialog"
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase">
                CSV Data Store Inspector (data/weather_data.csv)
              </h2>
              <p className="text-xs text-slate-400">
                Live standardized AWS telemetry storage ({rows.length} records persisted)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCsv}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Refresh CSV"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CSV Table Preview */}
        <div className="p-5 overflow-auto flex-1 font-mono text-xs">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading CSV data...</div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead className="bg-slate-950/80">
                  <tr>
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-[11px] font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
                  {rows.slice(-100).reverse().map((row, idx) => {
                    const cells = row.split(",");
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        {cells.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-3 py-1.5 whitespace-nowrap ${
                              cIdx === 0 ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-500 flex justify-between items-center">
          <span>Non-destructive CSV append • Guaranteed historical preservation</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
