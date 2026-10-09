import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Navigation, MapPin, LocateFixed, AlertCircle, Search, Loader2 } from "lucide-react";
import { createRide } from "../../services/api";

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CreateRideModal({ isOpen, onClose, onRideCreated, onPickDestination, user, startLocation, destination, onDestinationChange }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // GPS start
  const [gpsStart, setGpsStart] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const retryTimer = useRef(null);

  // Destination search
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState([]);
  const [destSearching, setDestSearching] = useState(false);
  const [destSelected, setDestSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const debouncedQuery = useDebounce(destQuery, 400);

  const rideStart = gpsStart || startLocation;
  // Use locally selected destination or the map-picked one from parent
  const activeDestination = destSelected || destination;

  // ── GPS ──────────────────────────────────────────────
  function requestLocation() {
    if (!navigator.geolocation) {
      setGpsError("This browser does not support GPS location.");
      return;
    }
    setLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsStart({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
        setPermissionDenied(false);
        setGpsError("");
        clearTimeout(retryTimer.current);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setGpsError("Location access was blocked. Please allow it in your browser settings and try again.");
        } else {
          setPermissionDenied(false);
          setGpsError("Could not get your location. Retrying…");
          retryTimer.current = setTimeout(() => requestLocation(), 4000);
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    if (isOpen) {
      setGpsStart(null);
      setGpsError("");
      setPermissionDenied(false);
      setDestQuery("");
      setDestResults([]);
      setDestSelected(null);
      setShowDropdown(false);
      requestLocation();
    }
    return () => clearTimeout(retryTimer.current);
  }, [isOpen]);

  // ── Nominatim Search ─────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setDestResults([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    setDestSearching(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&limit=6&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setDestResults(data || []);
        setShowDropdown(true);
      })
      .catch(() => { if (!cancelled) setDestResults([]); })
      .finally(() => { if (!cancelled) setDestSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutsideClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function selectDestination(result) {
    const dest = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name
    };
    setDestSelected(dest);
    setDestQuery(result.display_name);
    setShowDropdown(false);
    // Sync to parent if handler provided
    onDestinationChange?.(dest);
  }

  function clearDestination() {
    setDestSelected(null);
    setDestQuery("");
    setDestResults([]);
  }

  // ── Submit ───────────────────────────────────────────
  async function handleSubmit(event) {
    event.preventDefault();
    if (!rideStart || !activeDestination) return;
    setLoading(true);
    try {
      const data = await createRide({
        name,
        startLocation: { name: gpsStart ? "Rider GPS start" : "Simulation start", lat: rideStart.lat, lng: rideStart.lng },
        destination: { name: activeDestination.name || "Selected destination", lat: activeDestination.lat, lng: activeDestination.lng }
      });
      if (data.success) {
        clearTimeout(retryTimer.current);
        onRideCreated(data.ride, data.members, data.routeData);
        onClose();
      }
    } catch (error) {
      console.error("Could not create ride", error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
        <div className="mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Navigation size={18} className="text-emerald-400" />
          <h2 className="font-semibold">Start a group ride</h2>
        </div>

        {/* Location banner — shown until GPS captured */}
        {!gpsStart && (
          <div className={`mb-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${
            permissionDenied ? "border-rose-700 bg-rose-950/60 text-rose-300" : "border-amber-700 bg-amber-950/60 text-amber-300"
          }`}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              {permissionDenied ? (
                <>
                  <p className="font-semibold">Location access blocked</p>
                  <p className="mt-0.5 text-xs opacity-80">Open your browser settings, allow location for this site, then tap the button below.</p>
                  <button type="button" onClick={() => { setPermissionDenied(false); requestLocation(); }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-600 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900">
                    <LocateFixed size={13} /> Try again
                  </button>
                </>
              ) : locating ? (
                <>
                  <p className="font-semibold flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Detecting your location…
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">Please allow location access when your browser asks.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Location needed to start a ride</p>
                  <p className="mt-0.5 text-xs opacity-80">{gpsError || "Enable location access so we can set your start point."}</p>
                  <button type="button" onClick={() => requestLocation()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-900">
                    <LocateFixed size={13} /> Enable my location
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Ride name */}
          <label className="block text-sm text-slate-300">Ride name
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder={`${user?.name || "Rider"}'s ride`}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </label>

          {/* Starting from */}
          <div className={`rounded-lg border p-3 text-sm transition-colors ${gpsStart ? "border-emerald-700 bg-emerald-950/30" : "border-slate-800 bg-slate-950"}`}>
            <div className="text-slate-400">Starting from</div>
            {gpsStart ? (
              <div className="mt-1 flex items-center gap-2 text-emerald-300 font-mono text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {Number(gpsStart.lat).toFixed(5)}, {Number(gpsStart.lng).toFixed(5)} · GPS locked
              </div>
            ) : (
              <div className="mt-1 text-slate-500 text-xs italic">Waiting for location…</div>
            )}
          </div>

          {/* Destination search */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-sm text-slate-400">
              <MapPin size={15} />
              <span>Destination</span>
            </div>

            {/* Search input */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    if (destSelected) setDestSelected(null);
                  }}
                  onFocus={() => { if (destResults.length > 0) setShowDropdown(true); }}
                  placeholder="Search for a place, address…"
                  className={`w-full rounded-lg border bg-slate-950 pl-8 pr-8 py-2 text-sm text-white outline-none transition ${
                    destSelected ? "border-emerald-600" : "border-slate-700 focus:border-emerald-500"
                  }`}
                />
                {destSearching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                )}
                {destSelected && !destSearching && (
                  <button type="button" onClick={clearDestination}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {showDropdown && destResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {destResults.map((result) => (
                    <li key={result.place_id}>
                      <button
                        type="button"
                        onClick={() => selectDestination(result)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-800 transition border-b border-slate-800/60 last:border-0"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin size={11} className="mt-0.5 shrink-0 text-emerald-400" />
                          <div>
                            <p className="font-medium text-slate-200 line-clamp-1">
                              {result.name || result.display_name.split(",")[0]}
                            </p>
                            <p className="text-slate-500 line-clamp-1 mt-0.5">
                              {result.display_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* No results */}
              {showDropdown && !destSearching && destResults.length === 0 && debouncedQuery.length >= 3 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-xs text-slate-500 shadow-xl">
                  No places found for "{debouncedQuery}"
                </div>
              )}
            </div>

            {/* Selected destination coords */}
            {destSelected && (
              <div className="mt-1.5 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {Number(destSelected.lat).toFixed(5)}, {Number(destSelected.lng).toFixed(5)}
              </div>
            )}

            {/* Map pick fallback */}
            {!destSelected && (
              <button type="button" onClick={onPickDestination} disabled={!rideStart}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 transition">
                <MapPin size={12} /> Or pick a point on the map
              </button>
            )}

            {/* Map-picked destination (from parent) */}
            {!destSelected && destination && (
              <div className="mt-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
                <span className="font-mono">{Number(destination.lat).toFixed(5)}, {Number(destination.lng).toFixed(5)} · Map pin</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">Creating a ride sends its planned route to routing and available traffic, weather and event providers. Live GPS sharing remains optional and separate.</p>
          <p className="text-xs text-slate-500">The ride gets a code you can share with other riders.</p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={loading || !rideStart || !activeDestination}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Creating…" : "Start ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
