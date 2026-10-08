import React from "react";
import { Users, Flag, Shield, AlertTriangle, Compass, CheckCircle2, Copy } from "lucide-react";

export default function ActiveRidePanel({
  ride,
  membersCount = 5,
  separationStatus = "GROUPED",
  emergencyCorridor = false,
  onRequestRegroup,
  onToggleEmergency,
  onOpenRerouteModal,
  onEndRide
}) {
  if (!ride) return null;

  const getSeparationBadge = (status) => {
    switch (status) {
      case "CRITICAL_SEPARATION":
        return { label: "CRITICAL SPREAD", bg: "bg-red-950 text-red-400 border-red-800" };
      case "SEPARATED":
        return { label: "SEPARATED", bg: "bg-orange-950 text-orange-400 border-orange-800" };
      case "SPREAD_OUT":
        return { label: "SPREAD OUT", bg: "bg-amber-950 text-amber-400 border-amber-800" };
      default:
        return { label: "GROUPED", bg: "bg-emerald-950 text-emerald-400 border-emerald-800" };
    }
  };

  const sepBadge = getSeparationBadge(separationStatus);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
      {/* Ride Header & 6-Digit Code */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-100">{ride.name}</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-400 font-mono">Code:</span>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              {ride.code}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${sepBadge.bg}`}>
            {sepBadge.label}
          </span>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{membersCount} Riders</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Regroup, Reroute, Emergency Corridor */}
      <div className="grid grid-cols-2 gap-2">
        {/* Request Regroup Button */}
        <button
          onClick={onRequestRegroup}
          className="py-2 px-2.5 rounded-xl text-xs font-bold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 hover:border-violet-500/70 flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <Flag className="w-3.5 h-3.5 text-violet-400" />
          Request Regroup
        </button>

        {/* Disaster Reroute Button */}
        <button
          onClick={onOpenRerouteModal}
          className="py-2 px-2.5 rounded-xl text-xs font-bold bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 hover:border-teal-500/70 flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          Safe Rerouting
        </button>
      </div>

      {/* Emergency Corridor Toggle */}
      <button
        onClick={onToggleEmergency}
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between border transition ${
          emergencyCorridor
            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
            : "bg-slate-950/80 text-amber-300 border-amber-500/30 hover:border-amber-500/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Priority Emergency Corridor</span>
        </div>
        <span className="text-[10px] font-mono uppercase">
          {emergencyCorridor ? "ENABLED" : "OFF"}
        </span>
      </button>

      {/* End Ride Button */}
      <button
        onClick={onEndRide}
        className="w-full py-1.5 text-center text-[11px] text-slate-400 hover:text-red-400 transition"
      >
        End Group Ride Mode
      </button>
    </div>
  );
}
