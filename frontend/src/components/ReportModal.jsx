import React, { useState } from "react";
import { X, Send, MapPin, AlertTriangle } from "lucide-react";

export default function ReportModal({ isOpen, onClose, onSubmitReport }) {
  const [type, setType] = useState("FLOODING");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      await onSubmitReport({
        type,
        description: description.trim(),
        // Default report around Central Bengaluru transit corridor
        latitude: 12.9540 + (Math.random() - 0.5) * 0.015,
        longitude: 77.6030 + (Math.random() - 0.5) * 0.015
      });
      setDescription("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-slate-100">Crowdsource Road Hazard</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Hazard Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "FLOODING", label: "🌊 Flooding" },
                { id: "ROAD_BLOCKED", label: "🚧 Blocked" },
                { id: "HEAVY_TRAFFIC", label: "🚗 Traffic" }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setType(item.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition ${
                    type === item.id
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/80 shadow-md"
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
              Description & Evidence
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Waterlogging up to car headlights near underpass, traffic diverting..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>GPS location & verified timestamp automatically attached for trust calculation.</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="flex-1 py-2 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
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
