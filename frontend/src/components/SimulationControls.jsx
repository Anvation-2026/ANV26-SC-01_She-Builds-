import React from "react";
import { CloudRain, AlertOctagon, RotateCcw, Zap } from "lucide-react";

export default function SimulationControls({
  currentMode,
  loading,
  onSimulateHeavyRain,
  onSimulateRoadClosure,
  onSimulateCombined,
  onReset
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Disaster Simulation
        </h2>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          State: {currentMode}
        </span>
      </div>

      <div className="space-y-2">
        {/* Simulate Heavy Rain Button */}
        <button
          onClick={onSimulateHeavyRain}
          disabled={loading}
          className={`w-full py-2.5 px-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition duration-200 shadow-md ${
            currentMode === "HEAVY_RAIN"
              ? "bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900"
              : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:border-blue-500/60"
          }`}
        >
          <CloudRain className="w-4 h-4 text-blue-400" />
          Simulate Heavy Rain
        </button>

        {/* Simulate Road Closure Button */}
        <button
          onClick={onSimulateRoadClosure}
          disabled={loading}
          className={`w-full py-2.5 px-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition duration-200 shadow-md ${
            currentMode === "ROAD_CLOSURE"
              ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900"
              : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 hover:border-amber-500/60"
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          Simulate Road Closure
        </button>

        {/* Combined Disaster Simulation */}
        <button
          onClick={onSimulateCombined}
          disabled={loading}
          className={`w-full py-2.5 px-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition duration-200 shadow-md ${
            currentMode === "COMBINED"
              ? "bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900"
              : "bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 hover:border-red-500/60"
          }`}
        >
          <Zap className="w-4 h-4 text-red-400" />
          Simulate Combined Disaster
        </button>

        {/* Reset Scenario Button */}
        <button
          onClick={onReset}
          disabled={loading}
          className="w-full py-2 px-3.5 rounded-xl font-medium text-xs flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition mt-1"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          Reset Scenario
        </button>
      </div>
    </div>
  );
}
