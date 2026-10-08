import React from "react";
import { Play, Pause, RotateCcw, FastForward, Zap, Users, CloudRain, AlertTriangle, ChevronRight } from "lucide-react";

export default function SimulationControlsPanel({
  mode, // "LIVE" | "SIMULATION"
  onToggleMode,
  isPlaying,
  speedMultiplier = 1,
  activeScenario = 1,
  onPlay,
  onPause,
  onReset,
  onStep,
  onSetSpeed,
  onLoadScenario,
  onRiderAction
}) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
      {/* Mode Toggle Header: LIVE MODE vs SIMULATION MODE */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Control Mode
          </h4>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onToggleMode("LIVE")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              mode === "LIVE"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            LIVE GPS
          </button>
          <button
            onClick={() => onToggleMode("SIMULATION")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              mode === "SIMULATION"
                ? "bg-amber-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            SIMULATION
          </button>
        </div>
      </div>

      {mode === "SIMULATION" ? (
        <div className="space-y-3">
          {/* Play, Pause, Reset, Step & Speed Multipliers */}
          <div className="flex items-center justify-between gap-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1">
              {isPlaying ? (
                <button
                  onClick={onPause}
                  className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow transition"
                  title="Pause Simulation"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onPlay}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
                  title="Play Simulation"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onStep}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Step forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onReset}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Reset simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1">
              {[1, 2, 5, 10].map((mult) => (
                <button
                  key={mult}
                  onClick={() => onSetSpeed(mult)}
                  className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                    speedMultiplier === mult
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>

          {/* Predefined Scenarios 1 to 8 Dropdown / Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Demo Scenario (1–8)
            </label>
            <select
              value={activeScenario}
              onChange={(e) => onLoadScenario(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={1}>Scenario 1: Normal Group Ride (Cohesive)</option>
              <option value={2}>Scenario 2: Rider Falls Behind (Akash Lags)</option>
              <option value={3}>Scenario 3: Rider Goes Off Route (Rahul Diverges)</option>
              <option value={4}>Scenario 4: Rider Approaching (Proximity Alerts)</option>
              <option value={5}>Scenario 5: Heavy Rain (Severe Waterlogging)</option>
              <option value={6}>Scenario 6: Flooded Road (Hosur Underpass Submerged)</option>
              <option value={7}>Scenario 7: Large Public Event (Festival Congestion)</option>
              <option value={8}>Scenario 8: MAIN DEMO (Rain + Event + Off-Route + Separation)</option>
            </select>
          </div>

          {/* Individual Rider Manipulation Buttons */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Rider Perturbation Triggers
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                onClick={() => onRiderAction("move-off-route")}
                className="py-1.5 px-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 font-medium transition text-center"
              >
                Rahul Off Route
              </button>
              <button
                onClick={() => onRiderAction("fall-behind")}
                className="py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 font-medium transition text-center"
              >
                Akash Lag
              </button>
              <button
                onClick={() => onRiderAction("stop")}
                className="py-1.5 px-2 rounded-lg bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border border-orange-800/60 font-medium transition text-center"
              >
                Stop Vivek
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real GPS Device Tracking Active
          </div>
          <p className="text-[11px] text-slate-400">
            Broadcasting actual device geolocation at 1 update per 3s to connected ride room.
          </p>
        </div>
      )}
    </div>
  );
}
