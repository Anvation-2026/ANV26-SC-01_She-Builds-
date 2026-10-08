import React, { useEffect, useState } from "react";
import { X, Navigation, MapPin, LocateFixed } from "lucide-react";
import { createRide } from "../../services/api";

export default function CreateRideModal({ isOpen, onClose, onRideCreated, onPickDestination, user, startLocation, destination }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsStart, setGpsStart] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const rideStart = gpsStart || startLocation;
  useEffect(() => {
    if (isOpen) { setGpsStart(null); setGpsError(""); }
  }, [isOpen]);
  if (!isOpen) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rideStart || !destination) return;
    setLoading(true);
    try {
      const data = await createRide({
        name,
        startLocation: { name: gpsStart ? "Rider GPS start" : "Simulation start", lat: rideStart.lat, lng: rideStart.lng },
        destination: { name: destination.name || "Selected destination", lat: destination.lat, lng: destination.lng }
      });
      if (data.success) {
        onRideCreated(data.ride, data.members, data.routeData);
        onClose();
      }
    } catch (error) {
      console.error("Could not create ride", error);
    } finally {
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setGpsError("This browser does not support GPS location."); return; }
    setLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setGpsStart({ lat: coords.latitude, lng: coords.longitude }); setLocating(false); },
      (error) => { setGpsError(error.message || "Could not read your GPS location."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-white"><X size={18} /></button>
        <div className="mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Navigation size={18} className="text-emerald-400" />
          <h2 className="font-semibold">Start a group ride</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-300">Ride name
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder={`${user?.name || "Rider"}'s ride`} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </label>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
            <div className="text-slate-400">Starting from</div>
            <div className="mt-1 text-slate-200">{rideStart ? `${Number(rideStart.lat).toFixed(5)}, ${Number(rideStart.lng).toFixed(5)} · ${gpsStart ? "GPS" : "Simulation"}` : "Set a start point to create this ride."}</div>
            <button type="button" onClick={useCurrentLocation} disabled={locating} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"><LocateFixed size={14} />{locating ? "Finding GPS…" : "Use my GPS location"}</button>
            {gpsError && <p className="mt-2 text-xs text-rose-300">{gpsError}</p>}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-400"><MapPin size={15} /> Destination</div>
            <p className="my-2 text-sm text-slate-200">{destination ? `${Number(destination.lat).toFixed(5)}, ${Number(destination.lng).toFixed(5)}` : "Choose a point on the map"}</p>
            <button type="button" onClick={onPickDestination} disabled={!rideStart} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">Choose on map</button>
          </div>
          <p className="text-xs text-slate-500">Creating a ride sends its planned route to routing and available traffic, weather and event providers. Live GPS sharing remains optional and separate.</p>
          <p className="text-xs text-slate-500">The ride gets a code you can share with other riders.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={loading || !rideStart || !destination} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating…" : "Start ride"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
