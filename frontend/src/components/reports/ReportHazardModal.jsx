import React, { useState } from "react";
import { X, Send, AlertTriangle, MapPin, ShieldCheck } from "lucide-react";
import { createReport } from "../../services/api";

const HAZARD_TYPES = [
  { id: "FLOODING", label: "🌊 Flooding" },
  { id: "ROAD_BLOCKED", label: "🚧 Road Blocked" },
  { id: "ACCIDENT", label: "💥 Accident" },
  { id: "HEAVY_TRAFFIC", label: "🚗 Gridlock" },
  { id: "WATERLOGGING", label: "💧 Waterlogging" },
  { id: "EMERGENCY", label: "🚨 Emergency" }
];

export default function ReportHazardModal({ isOpen, onClose, userLocation, onReportCreated }) {
  const [type, setType] = useState("FLOODING");
  const [description, setDescription] = useState("");
  const [photoEvidence, setPhotoEvidence] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      if (!userLocation || !Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lng)) return;
      const lat = userLocation.lat;
      const lng = userLocation.lng;

      const res = await createReport({
        type,
        description: description.trim(),
        latitude: lat,
        longitude: lng,
        gpsAccuracy: userLocation.accuracy ?? 0,
        photoEvidence
      });

      if (res.success) {
        onReportCreated(res.report);
        setDescription("");
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-slate-100">Report Road Hazard</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Incident Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HAZARD_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setType(item.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition ${
                    type === item.id
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/80 shadow"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Incident Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water rising rapidly near Richmond underpass, 3 ft deep, cars stalling..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {userLocation ? `GPS attached (±${userLocation.accuracy ?? "?"}m)` : "Enable Live GPS to report location"}
            </span>
            <label className="flex items-center gap-1.5 text-cyan-400 cursor-pointer">
              <input
                type="checkbox"
                checked={photoEvidence}
                onChange={(e) => setPhotoEvidence(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Photo Attached</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim() || !userLocation}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Publishing..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
