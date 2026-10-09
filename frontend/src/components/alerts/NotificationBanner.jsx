import React from "react";
import { AlertTriangle, Flag, Users, CheckCircle, Navigation, X, Volume2, VolumeX, BellRing, BellOff } from "lucide-react";

export default function NotificationBanner({
  alerts = [],
  onDismiss,
  onAcknowledgeDeviation,
  soundEnabled = true,
  onToggleSound,
  speechEnabled = true,
  onToggleSpeech,
  desktopEnabled = false,
  onEnableDesktop,
  desktopSupported = true,
  isSimulationMode = false
}) {

  return (
    <div className="absolute top-4 left-6 right-6 z-[600] space-y-2 pointer-events-none">
      <div className="flex justify-end pointer-events-auto">
        <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/90 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={onToggleSpeech}
            aria-label={speechEnabled ? "Turn off spoken alerts" : "Turn on spoken alerts"}
            title={speechEnabled ? "Turn off spoken alerts" : "Turn on spoken alerts"}
            className="flex items-center gap-1.5 rounded-lg border-l border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {speechEnabled ? <Volume2 className="h-3.5 w-3.5 text-amber-300" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
            Voice {speechEnabled ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
            title={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-300" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
            Sound {soundEnabled ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={onEnableDesktop}
            disabled={!desktopSupported || desktopEnabled}
            title={!desktopSupported ? "This browser does not support desktop notifications" : desktopEnabled ? "Desktop alerts enabled" : "Allow notifications from this browser"}
            className="flex items-center gap-1.5 rounded-lg border-l border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-emerald-300"
          >
            {desktopEnabled ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {desktopEnabled ? "Desktop on" : desktopSupported ? "Enable desktop alerts" : "Desktop unavailable"}
          </button>
        </div>
      </div>
      {alerts.slice(0, 3).map((alert) => {
        const isCritical = alert.type === "danger" || alert.type === "route-hazard" || alert.severity === "HIGH" || alert.severity === "CRITICAL";
        const isDeviation = alert.type === "deviation";
        const alertMessage = alert.message || "";
        const messageAlreadyNamesRider = (alert.riderName || "").split(" and ")
          .filter(Boolean)
          .some((name) => alertMessage.toLowerCase().startsWith(name.toLowerCase()));

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
                <p className="text-xs text-slate-300 mt-0.5">
                  {alert.riderName && !messageAlreadyNamesRider && <strong>{alert.riderName}: </strong>}
                  {alertMessage}
                </p>
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
