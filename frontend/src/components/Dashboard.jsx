import React from "react";
import { CloudRain, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function Dashboard({ riskData, rainfall, traffic, affectedRoadsCount = 0 }) {
  const score = riskData?.score ?? 26;
  const level = riskData?.level ?? "LOW";

  const getRiskColor = (lvl) => {
    switch (lvl) {
      case "CRITICAL":
        return {
          bg: "bg-red-950/60",
          border: "border-red-500/50",
          text: "text-red-400",
          badge: "bg-red-500 text-white shadow-red-500/20"
        };
      case "HIGH":
        return {
          bg: "bg-orange-950/60",
          border: "border-orange-500/50",
          text: "text-orange-400",
          badge: "bg-orange-500 text-white shadow-orange-500/20"
        };
      case "MODERATE":
        return {
          bg: "bg-amber-950/60",
          border: "border-amber-500/50",
          text: "text-amber-400",
          badge: "bg-amber-500 text-slate-900 shadow-amber-500/20"
        };
      default:
        return {
          bg: "bg-emerald-950/60",
          border: "border-emerald-500/50",
          text: "text-emerald-400",
          badge: "bg-emerald-500 text-white shadow-emerald-500/20"
        };
    }
  };

  const riskTheme = getRiskColor(level);

  const getTrafficDescriptor = (tf) => {
    if (tf >= 75) return { label: "CRITICAL", color: "text-red-400" };
    if (tf >= 55) return { label: "HEAVY", color: "text-orange-400" };
    if (tf >= 35) return { label: "MODERATE", color: "text-amber-300" };
    return { label: "SMOOTH", color: "text-emerald-400" };
  };

  const trafficInfo = getTrafficDescriptor(traffic);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Current Conditions
        </h2>
        <span className="text-[11px] font-mono text-slate-500">Live Telemetry</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Rainfall */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/70 hover:border-slate-700 transition">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rainfall</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {rainfall} <span className="text-xs font-normal text-slate-400">mm/hr</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {rainfall > 50 ? "⚠️ Torrential Downpour" : rainfall > 25 ? "Moderate showers" : "Light drizzle / Normal"}
          </div>
        </div>

        {/* Traffic Level */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/70 hover:border-slate-700 transition">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Traffic</span>
          </div>
          <div className={`text-xl font-bold font-mono ${trafficInfo.color}`}>
            {traffic}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Density: <strong className={trafficInfo.color}>{trafficInfo.label}</strong>
          </div>
        </div>

        {/* Overall Risk */}
        <div className={`${riskTheme.bg} rounded-xl p-3 border ${riskTheme.border} col-span-1 transition`}>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${riskTheme.text}`} />
            <span>Overall Risk</span>
          </div>
          <div className={`text-xl font-black font-mono ${riskTheme.text}`}>
            {score}<span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <div className="mt-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${riskTheme.badge}`}>
              {level}
            </span>
          </div>
        </div>

        {/* Affected Roads */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/70 hover:border-slate-700 transition">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Affected Roads</span>
          </div>
          <div className="text-xl font-bold font-mono text-red-400">
            {affectedRoadsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {affectedRoadsCount > 0 ? "Corridors compromised" : "All routes clear"}
          </div>
        </div>
      </div>
    </div>
  );
}
