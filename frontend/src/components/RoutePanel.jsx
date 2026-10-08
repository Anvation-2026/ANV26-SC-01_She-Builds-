import React from "react";
import { Navigation, MapPin, Compass, Shield, Clock } from "lucide-react";
import { PRESET_LOCATIONS } from "../services/routing";

export default function RoutePanel({
  selectedDestination,
  onSelectDestination,
  onCalculateRoute,
  routeMetrics,
  isHazardDetected,
  loading
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          Route Planning
        </h2>
        <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
          OSRM Active
        </span>
      </div>

      <div className="space-y-3">
        {/* Origin */}
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/70">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Start
          </label>
          <div className="text-xs font-semibold text-slate-200 mt-1 flex items-center justify-between">
            <span>Central Bengaluru (Cubbon Park)</span>
            <span className="text-[10px] font-mono text-slate-400">12.9716°N, 77.5946°E</span>
          </div>
        </div>

        {/* Destination Selector */}
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/70">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span> Destination
          </label>
          <select
            value={selectedDestination.id}
            onChange={(e) => {
              const found = PRESET_LOCATIONS.find(loc => loc.id === e.target.value);
              if (found) onSelectDestination(found);
            }}
            className="w-full mt-1 bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {PRESET_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Find Safe Route Action */}
        <button
          onClick={onCalculateRoute}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 transition transform active:scale-[0.98]"
        >
          <Compass className="w-4 h-4" />
          {loading ? "Calculating..." : "Find Safe Route"}
        </button>

        {/* Route Metrics Card */}
        {routeMetrics && (
          <div className="mt-2 bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Normal ETA
                </span>
                <span className="text-base font-bold font-mono text-slate-300">
                  {routeMetrics.normalEtaMinutes} <span className="text-[11px] font-normal">mins</span>
                </span>
                <span className="text-[10px] text-slate-500 block">{routeMetrics.normalDistanceKm} km</span>
              </div>

              <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                <span className="text-[10px] text-emerald-300 block flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> Safe ETA
                </span>
                <span className="text-base font-bold font-mono text-emerald-300">
                  {routeMetrics.safeEtaMinutes} <span className="text-[11px] font-normal">mins</span>
                </span>
                <span className="text-[10px] text-emerald-500/90 block">{routeMetrics.safeDistanceKm} km</span>
              </div>
            </div>

            {/* Risk Avoided Metric */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 text-[11px]">Risk Avoided:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                isHazardDetected
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {isHazardDetected ? `${routeMetrics.riskAvoidedPercentage}% Reduced` : "0% (Direct Safe)"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
