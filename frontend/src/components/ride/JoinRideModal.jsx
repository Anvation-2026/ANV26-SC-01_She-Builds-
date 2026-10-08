import React, { useState } from "react";
import { X, KeyRound, UserCheck } from "lucide-react";
import { joinRide } from "../../services/api";

export default function JoinRideModal({ isOpen, onClose, onRideJoined, user }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleJoin = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-digit ride code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await joinRide(code.trim());

      if (data.success) {
        onRideJoined(data.ride, data.members);
        onClose();
      } else {
        setError(data.error || "Unable to join ride");
      }
    } catch (err) {
      setError("Network or server error joining ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <KeyRound className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-slate-100">Join Group Ride</h3>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Enter 6-Digit Ride Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 782914"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
              required
            />
          </div>

          <p className="text-xs text-slate-400">Joining as <span className="font-semibold text-slate-200">{user?.name}</span></p>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/80 text-xs text-red-300">
              {error}
            </div>
          )}

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
              disabled={loading || code.length !== 6}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/60 transition disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Squad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
