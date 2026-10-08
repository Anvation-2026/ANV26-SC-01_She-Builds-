import React, { useState } from "react";
import { X, Navigation, Users, MapPin, CheckCircle, Compass } from "lucide-react";
import { createRide } from "../../services/api";

const PRESET_PLACES = [
  { name: "Cubbon Park Central", lat: 12.9716, lng: 77.5946 },
  { name: "Koramangala Sony World Signal", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar 100 Feet Road", lat: 12.9784, lng: 77.6412 },
  { name: "Electronic City Toll Plaza", lat: 12.8452, lng: 77.6680 },
  { name: "Whitefield ITPL Main Gate", lat: 12.9863, lng: 77.7499 }
];

export default function CreateRideModal({ isOpen, onClose, onRideCreated }) {
  const [name, setName] = useState("Sunday Coastal Express");
  const [startPlace, setStartPlace] = useState(PRESET_PLACES[0]);
  const [destPlace, setDestPlace] = useState(PRESET_PLACES[1]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await createRide({
        name,
        leaderId: "user-leader",
        startLocation: { name: startPlace.name, lat: startPlace.lat, lng: startPlace.lng },
        destination: { name: destPlace.name, lat: destPlace.lat, lng: destPlace.lng }
      });

      if (data.success) {
        onRideCreated(data.ride, data.members, data.routeData);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
          <Navigation className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-slate-100">Create New Group Ride</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Ride Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monsoon Morning Ride"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Start Location
            </label>
            <select
              value={startPlace.name}
              onChange={(e) => {
                const found = PRESET_PLACES.find(p => p.name === e.target.value);
                if (found) setStartPlace(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PRESET_PLACES.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400"></span> Destination
            </label>
            <select
              value={destPlace.name}
              onChange={(e) => {
                const found = PRESET_PLACES.find(p => p.name === e.target.value);
                if (found) setDestPlace(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {PRESET_PLACES.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Compass className="w-3.5 h-3.5" />
              <span>OSRM Dynamic Route Engine</span>
            </div>
            <p>Creating this ride will generate a unique 6-digit code for all squad members to join.</p>
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
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 transition disabled:opacity-50"
            >
              {loading ? "Generating Route..." : "Start Group Ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
