import React, { useState } from "react";
import { Users, Flag, Shield, AlertTriangle, Compass, Copy, Check, LocateFixed, Radio } from "lucide-react";

export default function ActiveRidePanel({
  ride,
  isLeader = false,
  membersCount = 5,
  separationStatus = "GROUPED",
  emergencyCorridor = false,
  onRequestRegroup,
  onToggleEmergency,
  onOpenRerouteModal,
  isSharingLocation = false,
  onToggleLocationSharing,
  onSendSOS,
  sosSending = false,
  onEndRide
}) {
  const [copied, setCopied] = useState(false);
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
  const copyRideCode = async () => {
    if (!ride.code || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(String(ride.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn("Could not copy ride code", error);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
      {/* Ride Header & 6-Digit Code */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-100">{ride.name}</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
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

      <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-800/70 bg-slate-950 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium text-slate-400">Share this ride code</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-[0.24em] text-cyan-200 tabular-nums">{ride.code || "------"}</div>
        </div>
        <button
          type="button"
          onClick={copyRideCode}
          disabled={!ride.code}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          aria-label="Copy ride code"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleLocationSharing}
        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${isSharingLocation ? "border-emerald-500/50 bg-emerald-950/50" : "border-slate-700 bg-slate-950/70 hover:border-emerald-500/50"}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100"><LocateFixed size={16} className={isSharingLocation ? "text-emerald-400" : "text-slate-400"} />{isSharingLocation ? "Stop sharing location" : "Share live location"}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isSharingLocation ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{isSharingLocation ? "ON" : "OFF"}</span>
        </span>
        <span className="mt-1 block pl-6 text-xs text-slate-400">Live GPS goes to this ride’s members. Planned route checks also use external traffic, weather and available event providers.</span>
      </button>

      <button
        type="button"
        onClick={onSendSOS}
        disabled={sosSending}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-rose-600 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Radio size={17} className={sosSending ? "animate-pulse" : ""} />
        {sosSending ? "Sending SOS…" : "SOS · Alert nearby riders"}
      </button>
      <p className="-mt-2 text-xs text-slate-500">SOS requests a one-time GPS position. Continuous rider sharing stays optional.</p>

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
        {isLeader ? "End ride for everyone" : "Leave group ride"}
      </button>
    </div>
  );
}
