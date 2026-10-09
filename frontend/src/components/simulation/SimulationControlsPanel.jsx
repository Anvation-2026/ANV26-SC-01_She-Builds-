import React from "react";
import { Play, Pause, RotateCcw, Zap, ChevronRight, Gauge, CloudRain, AlertTriangle, Activity } from "lucide-react";

const SCENARIOS = [
  { id: 1, label: "Normal group ride", emoji: "🚴" },
  { id: 2, label: "Rider falls behind", emoji: "🐢" },
  { id: 3, label: "Rider leaves the route", emoji: "↗️" },
  { id: 4, label: "Rider catches up fast", emoji: "⚡" },
  { id: 5, label: "Heavy rain & waterlogging", emoji: "🌧️" },
  { id: 6, label: "Road closure & safer route", emoji: "🚧" },
  { id: 7, label: "Public gathering & congestion", emoji: "📢" },
  { id: 8, label: "Combined disruption (demo)", emoji: "🌪️" },
];

const SPEEDS = [0.5, 1, 2, 4];

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
  const getRiskColor = (level) => {
    if (level === "CRITICAL") return "text-red-400";
    if (level === "HIGH") return "text-orange-400";
    if (level === "MODERATE") return "text-amber-300";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-800/50 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">Simulation Engine</h4>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${
            isPlaying
              ? "bg-emerald-950 border-emerald-700 text-emerald-300"
              : "bg-slate-950 border-slate-700 text-slate-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            {isPlaying ? "Running" : "Paused"}
          </span>
        </div>

        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/80 mb-3">
          🎮 Sample data only — riders and incidents are not real.
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button onClick={onPause} title="Pause"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition">
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button onClick={onPlay} title="Play"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition">
              <Play className="w-4 h-4" /> Play
            </button>
          )}
          <button onClick={onStep} title="Step forward"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            disabled={isPlaying}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onReset} title="Reset"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed selector */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Gauge className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Speed</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => onSetSpeed(s)}
                className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                  speedMultiplier === s
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditions card */}
      {conditions && (
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Live Conditions
            </span>
            {conditions.risk && (
              <span className={`text-xs font-bold ${getRiskColor(conditions.risk.level)}`}>
                Risk {conditions.risk.score}/100 · {conditions.risk.level}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-2.5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CloudRain className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-[10px] text-slate-500 mb-0.5">Rain</div>
              <div className="text-sm font-bold text-cyan-300">{conditions.rainfall ?? "—"}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mm/h</span></div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-2.5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-[10px] text-slate-500 mb-0.5">Traffic</div>
              <div className="text-sm font-bold text-amber-300">{conditions.traffic ?? "—"}<span className="text-[10px] font-normal text-slate-400 ml-0.5">%</span></div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-2.5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
              </div>
              <div className="text-[10px] text-slate-500 mb-0.5">Incidents</div>
              <div className="text-sm font-bold text-red-300">{(conditions.hazards?.length || 0) + (conditions.events?.length || 0)}</div>
            </div>
          </div>
          {[...(conditions.hazards || []), ...(conditions.events || [])].length > 0 && (
            <ul className="mt-2.5 space-y-1 border-t border-slate-800 pt-2">
              {[...(conditions.hazards || []), ...(conditions.events || [])].map((item) => (
                <li key={item.id} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Scenario selector */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Load a Scenario
        </label>
        <div className="space-y-1">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => onLoadScenario(s.id)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition border ${
                activeScenario === s.id
                  ? "bg-amber-950/60 border-amber-700 text-amber-200 font-semibold"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}>
              <span className="text-sm leading-none">{s.emoji}</span>
              <span className="flex-1">{s.label}</span>
              {activeScenario === s.id && <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Active</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Rider perturbation triggers */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Manual Rider Triggers
        </label>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <button onClick={() => onRiderAction("move-off-route")}
            className="py-2 px-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 font-medium transition text-center leading-tight">
            Rahul<br />Off Route
          </button>
          <button onClick={() => onRiderAction("fall-behind")}
            className="py-2 px-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 font-medium transition text-center leading-tight">
            Akash<br />Falls Behind
          </button>
          <button onClick={() => onRiderAction("stop")}
            className="py-2 px-2 rounded-xl bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border border-orange-800/60 font-medium transition text-center leading-tight">
            Stop<br />Vivek
          </button>
        </div>
      </div>
    </div>
  );
}
