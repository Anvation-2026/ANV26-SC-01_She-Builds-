import React from "react";
import { AlertTriangle, Flag, Users, CheckCircle, Navigation, X } from "lucide-react";

export default function NotificationBanner({ alerts = [], onDismiss, onAcknowledgeDeviation }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="absolute top-4 left-6 right-6 z-[600] space-y-2 pointer-events-none">
      {alerts.slice(0, 3).map((alert) => {
        const isCritical = alert.type === "danger" || alert.severity === "HIGH" || alert.severity === "CRITICAL";
        const isDeviation = alert.type === "deviation";

        return (
          <div
            key={alert.id || alert.timestamp}
            className={`pointer-events-auto p-3 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center justify-between transition-all duration-300 animate-slide-down ${
              isCritical
                ? "bg-red-950/90 border-red-500/80 text-red-100"
                : isDeviation
                ? "bg-amber-950/90 border-amber-500/80 text-amber-100"
                : "bg-slate-900/90 border-slate-700 text-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/40">
                {isCritical ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                ) : isDeviation ? (
                  <Navigation className="w-4 h-4 text-amber-400" />
                ) : (
                  <Users className="w-4 h-4 text-cyan-400" />
                )}
              </div>

              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider">{alert.title}</h5>
                <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDeviation && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    onClick={() => onAcknowledgeDeviation && onAcknowledgeDeviation(false)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  >
                    Return to Route
                  </button>
                  <button
                    onClick={() => onAcknowledgeDeviation && onAcknowledgeDeviation(true)}
                    className="px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Intentional Exit
                  </button>
                </div>
              )}

              <button
                onClick={() => onDismiss(alert.id || alert.timestamp)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
