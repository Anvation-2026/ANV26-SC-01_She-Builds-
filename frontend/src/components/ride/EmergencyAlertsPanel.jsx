import React from "react";
import { AlertOctagon, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";

function formatAge(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  return seconds < 60 ? "just now" : `${Math.floor(seconds / 60)} min ago`;
}

export default function EmergencyAlertsPanel({ alerts = [], currentUserId, onAcknowledge, onResolve, onFocusLocation }) {
  const active = alerts.filter((alert) => alert.status !== "RESOLVED");
  return (
    <section className="rounded-2xl border border-rose-900/70 bg-slate-900/90 p-4 shadow-xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><AlertOctagon size={16} className="text-rose-400" />Emergency alerts</h3>
          <p className="mt-1 text-xs text-slate-400">SOS from nearby riders and your group.</p>
        </div>
        <span className="rounded-full bg-rose-950 px-2.5 py-1 text-xs font-semibold text-rose-300">{active.length} active</span>
      </header>
      {!alerts.length ? <p className="mt-4 rounded-lg bg-slate-950 p-3 text-sm text-slate-500">No emergency alerts nearby.</p> : (
        <div className="mt-3 space-y-2.5">
          {alerts.map((alert) => {
            const isCreator = alert.createdBy === currentUserId;
            const isAcknowledger = alert.acknowledgedBy === currentUserId;
            return (
              <article key={alert.id} className={`rounded-xl border p-3 ${alert.status === "RESOLVED" ? "border-slate-800 bg-slate-950/60" : "border-rose-900/70 bg-rose-950/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{alert.riderName || "Rider"} needs help</p>
                    <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${alert.status === "RESOLVED" ? "bg-slate-800 text-slate-400" : alert.status === "ACKNOWLEDGED" ? "bg-amber-950 text-amber-300" : "bg-rose-950 text-rose-300"}`}>{alert.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{formatAge(alert.createdAt)}</span>
                  {Number.isFinite(alert.distanceMeters) && <span>{alert.distanceMeters > 999 ? `${(alert.distanceMeters / 1000).toFixed(1)} km away` : `${alert.distanceMeters} m away`}</span>}
                  {alert.acknowledgedByName && <span>Acknowledged by {alert.acknowledgedByName}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {alert.location && <button type="button" onClick={() => onFocusLocation?.({ ...alert.location, zoom: 15 })} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"><MapPin size={13} />Show location</button>}
                  {alert.status === "ACTIVE" && !isCreator && <button type="button" onClick={() => onAcknowledge(alert.id)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"><ShieldCheck size={13} />I’m responding</button>}
                  {alert.status !== "RESOLVED" && (isCreator || isAcknowledger) && <button type="button" onClick={() => onResolve(alert.id)} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"><CheckCircle2 size={13} />Mark resolved</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
