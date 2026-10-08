import React from "react";
import { Users, AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";

export default function RiderList({ riders = [], relativeDistances = {}, live = false }) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Rider Roster ({riders.length})
        </h4>
        <span className="text-[10px] font-mono text-slate-500">{live ? "Live GPS" : "Simulation"}</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {riders.map((item) => {
          const r = item.rider || item;
          const loc = item.location || r.lastLocation;
          const isLeader = r.role === "LEADER";
          const isOffRoute = r.isOffRoute || r.offRouteState?.isOffRoute;
          const isStopped = r.isStopped;

          const relData = relativeDistances[r.userId || r.id];

          return (
            <div
              key={r.userId}
              className={`p-2.5 rounded-xl border text-xs transition ${
                isOffRoute
                  ? "bg-red-950/30 border-red-800/80"
                  : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{isLeader ? "⭐" : r.avatar || "🚴"}</span>
                  <div>
                    <span className="font-bold text-slate-200">{r.name}</span>
                    {isLeader && (
                      <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-amber-950 text-amber-400 border border-amber-800">
                        LEADER
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-slate-300">
                    {loc?.speed || 0} km/h
                  </span>
                </div>
              </div>

              {/* Relative Distance and Deviation Alerts */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                {isOffRoute ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Off Route ({Number.isFinite(Number(r.offRouteState?.distance)) ? `${r.offRouteState.distance}m` : "distance unavailable"})
                  </span>
                ) : live && !loc ? (
                  <span className="text-slate-400">Location not shared</span>
                ) : isStopped ? (
                  <span className="text-amber-400">Rider Stopped</span>
                ) : relData ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    {relData.isAhead ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {relData.relativeLabel} • ETA {relData.etaMinutes}m
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    On Route Corridor
                  </span>
                )}

                <span className="text-[10px] font-mono text-slate-500">
                  {Number.isFinite(Number(loc?.accuracy)) ? `GPS accuracy: ${loc.accuracy} m` : "GPS accuracy unavailable"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
