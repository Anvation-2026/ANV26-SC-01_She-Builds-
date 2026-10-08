import React from "react";
import { AlertTriangle, Droplets, Ban, ShieldAlert, CheckCircle } from "lucide-react";

export default function HazardPanel({ hazards = [], selectedHazard, onSelectHazard }) {
  const activeHazards = hazards.filter(h => h.active);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          Active Road Hazards
        </h2>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {activeHazards.length} Active
        </span>
      </div>

      {activeHazards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center text-slate-500">
          <CheckCircle className="w-8 h-8 text-emerald-500/60 mb-1" />
          <p className="text-xs font-medium text-slate-300">All Corridors Clear</p>
          <p className="text-[11px] text-slate-400 mt-0.5">No active flood zones or closures detected.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {activeHazards.map((h) => {
            const isCritical = h.severity > 80 || h.blocked;
            const isSelected = selectedHazard?.id === h.id;

            return (
              <div
                key={h.id}
                onClick={() => onSelectHazard(h)}
                className={`p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-950/30"
                    : isCritical
                    ? "border-red-900/60 bg-red-950/20 hover:border-red-700/80"
                    : "border-orange-900/60 bg-orange-950/20 hover:border-orange-700/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {h.type === "FLOODING" ? (
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    ) : h.type === "ROAD_CLOSURE" ? (
                      <Ban className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {h.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isCritical ? "bg-red-950 text-red-400 border border-red-800" : "bg-orange-950 text-orange-400 border border-orange-800"
                    }`}
                  >
                    {h.severity}% Risk
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span className={h.blocked ? "text-red-400 font-bold" : "text-amber-400"}>
                    {h.blocked ? "● ROAD BLOCKED" : "● WATERLOGGED / SLOW"}
                  </span>
                  <span className="text-slate-400">Conf: {h.confidence}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
