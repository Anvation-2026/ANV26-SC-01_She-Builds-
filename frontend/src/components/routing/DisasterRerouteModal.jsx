import React, { useState } from "react";
import { X, ShieldAlert, Compass, Check, AlertTriangle, ArrowRight } from "lucide-react";

export default function DisasterRerouteModal({
  isOpen,
  onClose,
  alternatives,
  onApplyReroute
}) {
  const [selectedKey, setSelectedKey] = useState("safest");

  if (!isOpen) return null;

  if (!alternatives) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-3">
            <Compass className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-slate-100">Safe Route Corridor</h3>
          </div>
          <p className="text-xs text-slate-300 mb-4">
            Current route corridor has no active hazard blocks. You are already traveling on the optimal path.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const options = [
    { key: "safest", data: alternatives.safest },
    { key: "balanced", data: alternatives.balanced },
    { key: "fastest", data: alternatives.fastest }
  ].filter(item => item.data);

  const handleApply = () => {
    const chosen = alternatives[selectedKey];
    if (chosen) {
      onApplyReroute(chosen);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <div>
            <h3 className="font-bold text-base text-slate-100">Disaster-Aware Route Selection</h3>
            <p className="text-[11px] text-slate-400">Compare live traffic, estimated time, and reported hazards before choosing the group route.</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {options.map(({ key, data }) => {
            const isSelected = selectedKey === key;
            const isSafest = key === "safest";
            const isFastest = key === "fastest";

            return (
              <div
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`p-3.5 rounded-xl border cursor-pointer transition relative ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/40"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-100">{data.label}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isSafest
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : isFastest
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    }`}>
                      {data.badge}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold ${
                      data.riskLevel === "LOW" ? "text-emerald-400" : data.riskLevel === "CRITICAL" ? "text-red-400" : "text-amber-400"
                    }`}>
                      {data.riskScore}% Risk ({data.riskLevel})
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-2">{data.description}</p>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[10px] block">DISTANCE</span>
                    <span className="font-bold text-slate-200">{data.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">EST. TIME</span>
                    <span className="font-bold text-slate-200">{data.etaMinutes} mins</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">HAZARD EXPOSURE</span>
                    <span className={`font-bold ${data.hazardCount === 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {data.hazardCount === 0 ? "0 hazards" : `${data.hazardCount} hazard${data.hazardCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  {data.trafficDelaySeconds > 0 && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">TRAFFIC DELAY</span>
                      <span className="font-bold text-slate-200">{Math.round(data.trafficDelaySeconds / 60)} mins</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Apply to Entire Group
          </button>
        </div>
      </div>
    </div>
  );
}
