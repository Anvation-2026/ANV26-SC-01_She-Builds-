import React from "react";
import { AlertTriangle, MapPin, Radio, Users } from "lucide-react";

function formatTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

export default function DisasterIntelligencePanel({
  hazards = [],
  events = [],
  feedStatus = {},
  onToggleHazard,
  onToggleEvent,
  onFocusLocation
}) {
  const activeHazards = hazards.filter((hazard) => hazard.active);
  const activeEvents = events.filter((event) => event.status === "ACTIVE");

  return (
    <section className="space-y-6 text-slate-200">
      <header className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-white">Road alerts</h2>
        <p className="mt-1 text-sm text-slate-400">Traffic feed and rider reports available to this ride.</p>
      </header>

      <div className="grid grid-cols-1 gap-2">
        {[
          ["TomTom traffic", feedStatus.tomtomTraffic],
          ["Live weather", feedStatus.weather],
          ["Public events", feedStatus.publicEvents],
          ["Police incidents", feedStatus.police]
        ].map(([name, status]) => (
          <div key={name} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">{name}</span>
              <span className={`rounded-full px-2 py-1 font-medium ${status?.status === "connected" ? "bg-emerald-950 text-emerald-300" : status?.status === "error" ? "bg-rose-950 text-rose-300" : "bg-slate-800 text-slate-400"}`}>
                {status?.status === "connected" ? "Connected" : status?.status === "waiting_for_active_ride" ? "Waiting for active ride" : status?.status === "waiting_for_riders" ? "Waiting for GPS" : status?.status === "disabled" ? "Disabled" : status?.status === "waiting_for_location_provider" ? "Location lookup unavailable" : status?.status === "no_public_feed" ? "No feed configured" : status?.status || "Checking"}
              </span>
            </div>
            {status?.lastError && <p className="mt-1 text-[11px] text-rose-300">{status.lastError}</p>}
            {status?.setupMessage && <p className="mt-1 text-[11px] text-amber-300">{status.setupMessage}</p>}
            {status?.message && <p className="mt-1 text-[11px] text-slate-500">{status.message}</p>}
            {status?.coverage && <p className="mt-1 text-[11px] leading-4 text-slate-500">{status.coverage}</p>}
            {status?.lastSuccessAt && <p className="mt-1 text-[10px] text-slate-600">Last successful check: {formatTime(status.lastSuccessAt)}</p>}
          </div>
        ))}
        <p className="px-1 text-[11px] leading-4 text-slate-500">Public event listings are congestion hints only. They do not verify a road closure or crowd size.</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Active road alerts</span>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 font-medium text-white">{activeHazards.length}</span>
      </div>

      {activeHazards.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          No active road alerts in the current feed.
        </div>
      ) : (
        <div className="space-y-3">
          {activeHazards.map((hazard) => (
            <article key={hazard.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-white">{hazard.name || hazard.type?.replaceAll("_", " ") || "Road alert"}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-300">{hazard.description || "No description provided."}</p>
                </div>
                {Number.isFinite(hazard.severity) && (
                  <span className="shrink-0 text-xs text-slate-400">Severity {hazard.severity}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Radio size={13} />{hazard.source || "Rider report"}</span>
                <span>{formatTime(hazard.sourceUpdatedAt || hazard.createdAt || hazard.fetchedAt)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {Number.isFinite(hazard.latitude) && Number.isFinite(hazard.longitude) && (
                  <button
                    type="button"
                    onClick={() => onFocusLocation?.({ lat: hazard.latitude, lng: hazard.longitude, zoom: 15 })}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <MapPin size={13} /> Show on map
                  </button>
                )}
                {onToggleHazard && hazard.source !== "TomTom Traffic" && (
                  <button type="button" onClick={() => onToggleHazard(hazard.id)} className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800">
                    Resolve
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="border-t border-slate-800 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Public events</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} />{activeEvents.length} active</span>
        </div>
        {activeEvents.length === 0 ? (
          <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            {feedStatus.publicEvents?.status === "connected"
              ? "No Ticket Fairy listings were returned for the covered route locations. This does not mean no public event is happening."
              : feedStatus.publicEvents?.setupMessage || feedStatus.publicEvents?.lastError || "Event feed is waiting for an active ride."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {activeEvents.map((event) => (
              <article key={event.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <h4 className="font-medium text-white">{event.name || event.type || "Public event"}</h4>
                {event.description && <p className="mt-1 text-sm text-slate-300">{event.description}</p>}
                <div className="mt-2 text-xs text-slate-500">{event.source || "Source unavailable"}{event.startTime ? ` · ${event.timeApproximate ? new Date(event.startTime).toLocaleDateString() : formatTime(event.startTime)}` : ""}</div>
                {event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200">Open event details</a>}
                {onToggleEvent && <button type="button" onClick={() => onToggleEvent(event.id)} className="mt-3 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800">Resolve</button>}
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        Feed data can be incomplete. Confirm hazards before changing your route.
      </p>
    </section>
  );
}
