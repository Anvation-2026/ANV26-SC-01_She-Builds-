import React from "react";
import { Play, Pause, RotateCcw, Zap, ChevronRight } from "lucide-react";

export default function SimulationControlsPanel({
  isPlaying,
  speedMultiplier = 1,
  activeScenario = 1,
  onPlay,
  onPause,
  onReset,
  onStep,
  onSetSpeed,
  onLoadScenario,
  onRiderAction,
  conditions
}) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
      {/* Simulation mode is the only available mode. */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Simulation
          </h4>
        </div>
        <span className="rounded-md border border-amber-800/70 bg-amber-950/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          Simulation mode
        </span>
      </div>

      <div className="space-y-3">
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            Simulation only · these riders and incidents are sample data.
          </div>

          {conditions && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Scenario conditions</span>
                {conditions.risk && <span className="text-xs font-medium text-amber-300">Risk {conditions.risk.score}/100 · {conditions.risk.level}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-900 px-2 py-2"><div className="text-[10px] text-slate-500">Rain</div><div className="mt-0.5 text-sm font-semibold text-slate-100">{conditions.rainfall ?? "—"}<span className="ml-1 text-[10px] font-normal text-slate-400">mm/h</span></div></div>
                <div className="rounded-md bg-slate-900 px-2 py-2"><div className="text-[10px] text-slate-500">Traffic</div><div className="mt-0.5 text-sm font-semibold text-slate-100">{conditions.traffic ?? "—"}<span className="ml-1 text-[10px] font-normal text-slate-400">%</span></div></div>
                <div className="rounded-md bg-slate-900 px-2 py-2"><div className="text-[10px] text-slate-500">Incidents</div><div className="mt-0.5 text-sm font-semibold text-slate-100">{(conditions.hazards?.length || 0) + (conditions.events?.length || 0)}</div></div>
              </div>
              {[...(conditions.hazards || []), ...(conditions.events || [])].length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-slate-800 pt-2 text-[11px] text-slate-300">
                  {[...(conditions.hazards || []), ...(conditions.events || [])].map((item) => <li key={item.id}>{item.name}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Play, Pause, Reset, Step */}
          <div className="flex items-center justify-center gap-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
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
          </div>

          {/* Predefined Scenarios 1 to 8 Dropdown / Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Choose a scenario
            </label>
            <select
              value={activeScenario}
              onChange={(e) => onLoadScenario(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={1}>Normal group ride</option>
              <option value={2}>Rider falls behind</option>
              <option value={3}>Rider leaves the route</option>
              <option value={4}>Rider catches up</option>
              <option value={5}>Heavy rain and waterlogging</option>
              <option value={6}>Road closure and safer route</option>
              <option value={7}>Public gathering and congestion</option>
              <option value={8}>Combined disruption</option>
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
    </div>
  );
}
