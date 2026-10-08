import React, { useState } from "react";
import {
  CloudRain,
  Droplets,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Users,
  Compass,
  Car,
  Wind,
  CheckCircle2,
  MapPin,
  Megaphone,
  Radio,
  Eye,
  Activity,
  Layers
} from "lucide-react";

export default function DisasterIntelligencePanel({
  rainfall = 12,
  traffic = 35,
  riskData = { score: 25, level: "SAFE" },
  hazards = [],
  events = [],
  onToggleHazard,
  onToggleEvent,
  onFocusLocation
}) {
  const [filterSection, setFilterSection] = useState("ALL"); // "ALL" | "WEATHER" | "TRAFFIC" | "FLOODS" | "EVENTS"

  const activeHazards = hazards.filter((h) => h.active);
  const activeEvents = events.filter((e) => e.status === "ACTIVE");

  // Environmental calculations
  const getRainStatus = (rf) => {
    if (rf >= 75) return { label: "EXTREME DOWNPOUR", color: "text-red-400 bg-red-950/80 border-red-800" };
    if (rf >= 45) return { label: "HEAVY RAIN", color: "text-orange-400 bg-orange-950/80 border-orange-800" };
    if (rf >= 20) return { label: "MODERATE RAIN", color: "text-amber-400 bg-amber-950/80 border-amber-800" };
    return { label: "CLEAR / NOMINAL", color: "text-emerald-400 bg-emerald-950/80 border-emerald-800" };
  };

  const getTrafficStatus = (tr) => {
    if (tr >= 75) return { label: "CRITICAL GRIDLOCK", color: "text-red-400 bg-red-950/80 border-red-800" };
    if (tr >= 50) return { label: "HEAVY CONGESTION", color: "text-orange-400 bg-orange-950/80 border-orange-800" };
    if (tr >= 30) return { label: "MODERATE TRAFFIC", color: "text-amber-400 bg-amber-950/80 border-amber-800" };
    return { label: "SMOOTH TRANSIT", color: "text-emerald-400 bg-emerald-950/80 border-emerald-800" };
  };

  const rainStatus = getRainStatus(rainfall);
  const trafficStatus = getTrafficStatus(traffic);

  // Dynamic corridor speeds
  const avgSpeed = Math.max(6, Math.round(45 * (1 - traffic / 110)));
  const frictionGrip = rainfall > 65 ? "0.31 (Severe Slip Hazard)" : rainfall > 25 ? "0.52 (Reduced Grip)" : "0.85 (Dry Nominal)";
  const waterRunoff = (rainfall * 0.16).toFixed(1);
  const visibility = rainfall > 65 ? "< 200 meters" : rainfall > 25 ? "1.2 km" : "> 6 km (Clear)";

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 via-orange-600 to-amber-500 flex items-center justify-center shadow-lg border border-red-500/30">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100 flex items-center gap-1.5 font-mono">
              Urban Disaster Intelligence
            </h3>
            <p className="text-[10px] text-slate-400">
              Live Sensor Telemetry & Hyper-Local Threat Directory
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          REAL-TIME
        </span>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-medium scrollbar-thin">
        {[
          { id: "ALL", label: "All Intel" },
          { id: "WEATHER", label: `🌧️ Rain (${rainfall}mm)` },
          { id: "TRAFFIC", label: `🚗 Traffic (${traffic}%)` },
          { id: "FLOODS", label: `🌊 Floods (${activeHazards.length})` },
          { id: "EVENTS", label: `📢 Strikes (${activeEvents.length})` }
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilterSection(btn.id)}
            className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition font-mono ${
              filterSection === btn.id
                ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/50"
                : "bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. ENVIRONMENTAL CONDITIONS */}
      {/* ------------------------------------------------------------------ */}
      {(filterSection === "ALL" || filterSection === "WEATHER") && (
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              1. Environmental Conditions & Rainfall
            </h4>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${rainStatus.color}`}>
              {rainStatus.label}
            </span>
          </div>

          {/* Rainfall Gauge Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Precipitation Intensity</span>
              <span className="font-bold text-cyan-300">{rainfall} mm/hr</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  rainfall > 70
                    ? "bg-gradient-to-r from-amber-500 to-red-500"
                    : rainfall > 30
                    ? "bg-gradient-to-r from-blue-500 to-amber-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
                style={{ width: `${Math.min(100, (rainfall / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* Environmental Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Surface Grip Friction</span>
              <span className="font-bold text-slate-200 block mt-0.5">{frictionGrip}</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Runoff Accumulation</span>
              <span className="font-bold text-cyan-300 block mt-0.5">+{waterRunoff} cm/hr</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Visibility Horizon</span>
              <span className="font-bold text-slate-200 block mt-0.5">{visibility}</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Hydroplaning Hazard</span>
              <span className={`font-bold block mt-0.5 ${rainfall > 50 ? "text-red-400" : "text-emerald-400"}`}>
                {rainfall > 50 ? "HIGH RISK (Braking x2)" : "LOW RISK"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. TRAFFIC CONDITIONS */}
      {/* ------------------------------------------------------------------ */}
      {(filterSection === "ALL" || filterSection === "TRAFFIC") && (
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-amber-400" />
              2. Urban Traffic Density & Bottlenecks
            </h4>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${trafficStatus.color}`}>
              {trafficStatus.label}
            </span>
          </div>

          {/* Traffic Density Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Congestion Saturation</span>
              <span className="font-bold text-amber-300">{traffic}% Density</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  traffic > 75
                    ? "bg-red-500"
                    : traffic > 50
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${traffic}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Avg Corridor Speed</span>
              <span className="font-bold text-amber-300 block mt-0.5 font-mono">{avgSpeed} km/h (Nominal: 45)</span>
            </div>
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-mono">Transit Delay Multiplier</span>
              <span className="font-bold text-red-400 block mt-0.5 font-mono">{(1 + traffic / 50).toFixed(1)}x Travel Time</span>
            </div>
          </div>

          {/* Key Bottleneck Corridors */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Active Arterial Bottlenecks:
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-200">Hosur Road Underpass:</span>
                <span className="text-red-400 font-mono font-bold">GRIDLOCK (0-5 km/h)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-200">MG Road / Trinity Circle:</span>
                <span className="text-orange-400 font-mono font-bold">CHOKED (8 km/h)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-200">Indiranagar 100 Ft Rd:</span>
                <span className="text-purple-400 font-mono font-bold">DIVERTED / BLOCKED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. FLOODS & WATERLOGGING DIRECTORY */}
      {/* ------------------------------------------------------------------ */}
      {(filterSection === "ALL" || filterSection === "FLOODS") && (
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-400" />
              3. Floods & Waterlogged Underpasses ({hazards.length})
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-bold">
              {activeHazards.length} ACTIVE
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {hazards.map((h) => {
              const isActive = h.active;
              const isCritical = h.severity > 80 || h.blocked;

              return (
                <div
                  key={h.id}
                  className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                    isActive
                      ? isCritical
                        ? "bg-red-950/25 border-red-800/80 shadow-sm"
                        : "bg-amber-950/25 border-amber-800/80"
                      : "bg-slate-900/50 border-slate-800/60 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🌊</span>
                        <span className="font-bold text-slate-200">{h.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Corridor: {h.corridor || "Central Bengaluru"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isActive
                            ? "bg-red-950 text-red-400 border-red-800"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {isActive ? "ACTIVE HAZARD" : "STANDBY"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {h.severity}% Severity
                      </span>
                    </div>
                  </div>

                  {/* Water Depth & Blocked Badge */}
                  <div className="flex items-center justify-between bg-slate-950/90 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-mono font-bold text-cyan-300">
                        Water Depth: {h.waterDepth || "3.5 ft"}
                      </span>
                    </div>

                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                        h.blocked
                          ? "bg-red-950/90 text-red-400 border border-red-800"
                          : "bg-amber-950/90 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {h.blocked ? "⛔ ROAD BLOCKED" : "⚠️ HAZARDOUS CRAWL"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    "{h.description}"
                  </p>

                  {/* Actions: Focus on Map & Toggle Active */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() =>
                        onFocusLocation &&
                        onFocusLocation({ lat: h.latitude, lng: h.longitude, zoom: 15 })
                      }
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      Focus on Map
                    </button>

                    {onToggleHazard && (
                      <button
                        onClick={() => onToggleHazard(h.id)}
                        className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition ${
                          isActive
                            ? "bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/40"
                            : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. PROTESTS, STRIKES & CIVIL ASSEMBLIES DIRECTORY */}
      {/* ------------------------------------------------------------------ */}
      {(filterSection === "ALL" || filterSection === "EVENTS") && (
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-purple-400" />
              4. Protests, Strikes & Public Assemblies ({events.length})
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold">
              {activeEvents.length} ACTIVE
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {events.map((ev) => {
              const isActive = ev.status === "ACTIVE";
              const isStrike = ev.type === "STRIKE";
              const isFestival = ev.type === "FESTIVAL";

              const badgeColor = isStrike
                ? "bg-red-950 text-red-400 border-red-800"
                : isFestival
                ? "bg-purple-950 text-purple-400 border-purple-800"
                : "bg-orange-950 text-orange-400 border-orange-800";

              return (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                    isActive
                      ? isStrike
                        ? "bg-red-950/20 border-red-800/80"
                        : "bg-purple-950/20 border-purple-800/80"
                      : "bg-slate-900/50 border-slate-800/60 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{isStrike ? "📢" : isFestival ? "🎪" : "✊"}</span>
                        <span className="font-bold text-slate-200">{ev.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Corridor: {ev.affectedCorridor}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                      {ev.type}
                    </span>
                  </div>

                  {/* Impact details: Attendance, Capacity Reduction & Police Diversions */}
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950/90 p-2 rounded-lg border border-slate-800/80 text-[11px] font-mono">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users className="w-3 h-3 text-cyan-400" />
                      <span>{ev.expectedAttendance ? ev.expectedAttendance.toLocaleString() : 15000} Crowd</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>-{(ev.roadCapacityReduction * 100) || 50}% Lane Choke</span>
                    </div>

                    {ev.policeDiversion && (
                      <div className="col-span-2 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 pt-0.5 border-t border-slate-800/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Police Diversions Enforced Around Assembly Perimeter
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    "{ev.description}"
                  </p>

                  {/* Actions: Focus on Map & Toggle Status */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() =>
                        onFocusLocation &&
                        onFocusLocation({ lat: ev.latitude, lng: ev.longitude, zoom: 15 })
                      }
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <MapPin className="w-3 h-3 text-purple-400" />
                      Focus on Map
                    </button>

                    {onToggleEvent && (
                      <button
                        onClick={() => onToggleEvent(ev.id)}
                        className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition ${
                          isActive
                            ? "bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
