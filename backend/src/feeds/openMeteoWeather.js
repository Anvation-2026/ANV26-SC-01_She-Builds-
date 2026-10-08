import { db } from "../database/spatialStore.js";
import { calculateDistance } from "../geo/haversine.js";
import { checkRouteHazards } from "../routing/routingService.js";

const POLL_MS = 5 * 60_000;
let timer;
let state = { enabled: true, status: "not_started", lastSuccessAt: null, lastError: null, hazardCount: 0, coveredLocations: 0 };

function sampleRoute(coordinates, count) {
  if (!coordinates.length) return [];
  if (coordinates.length <= count) return coordinates;
  return Array.from({ length: count }, (_, index) => coordinates[Math.round(index * (coordinates.length - 1) / (count - 1))]);
}

function riderLocations() {
  const now = Date.now();
  const points = [];
  for (const ride of db.rides.values()) {
    for (const member of db.getRideMembers(ride.id)) {
      const point = member.lastLocation;
      const age = now - Date.parse(member.lastSeenAt || "");
      if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && age >= 0 && age < 2 * 60_000) points.push(point);
    }
    if (ride.status === "ACTIVE") {
      if (Number.isFinite(ride.startLocation?.lat) && Number.isFinite(ride.startLocation?.lng)) points.push(ride.startLocation);
      const coordinates = ride.plannedRoute?.geometry?.coordinates || [];
      sampleRoute(coordinates, 8).forEach(([lng, lat]) => points.push({ lat, lng }));
    }
  }
  return points.filter((point, index) => points.findIndex((other) => calculateDistance(point, other) < 2_000) === index).slice(0, 12);
}

function normalizeWeather(point, current, fetchedAt) {
  const code = Number(current.weather_code);
  const rain = Number(current.rain || 0) + Number(current.showers || 0);
  const wind = Number(current.wind_speed_10m || 0);
  const gusts = Number(current.wind_gusts_10m || 0);
  const thunderstorm = [95, 96, 99].includes(code);
  const heavyRain = rain >= 7;
  const strongWind = Math.max(wind, gusts) >= 50;
  
  // Calculate dynamic severity
  const rainSeverity = Math.min(50, rain * 5);
  const windSeverity = Math.min(30, Math.max(wind, gusts) * 0.5);
  const stormBonus = thunderstorm ? 20 : 0;
  const severity = Math.min(100, Math.round(rainSeverity + windSeverity + stormBonus));

  if (!thunderstorm && !heavyRain && !strongWind && ![45, 48, 56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return null;

  // Ignore minor incidents
  if (severity < 45 && !heavyRain && !strongWind) return null;

  const type = thunderstorm ? "THUNDERSTORM" : heavyRain ? "HEAVY_RAIN" : strongWind ? "STRONG_WIND" : "SEVERE_WEATHER";
  const id = `OPENMETEO-${point.lat.toFixed(1)}-${point.lng.toFixed(1)}`;
  const description = [
    thunderstorm ? "Thunderstorm conditions" : null,
    rain > 0 ? `Rain ${rain} mm` : null,
    wind > 0 ? `Wind ${wind} km/h` : null,
    gusts > 0 ? `Gusts ${gusts} km/h` : null
  ].filter(Boolean).join(" · ");
  return {
    id, source: "Open-Meteo", type, name: type.replaceAll("_", " "), description,
    latitude: point.lat, longitude: point.lng, radiusMeters: 5_000,
    severity, confidence: 70,
    active: true, blocked: false, fetchedAt, sourceUpdatedAt: current.time || fetchedAt,
    sourceUrl: "https://open-meteo.com/"
  };
}

export function getWeatherFeedStatus() {
  return { ...state, coverage: "Current model conditions near sampled active-route points and recent shared GPS; not a guarantee of sudden local conditions." };
}

export async function pollOpenMeteoWeather(io) {
  const points = riderLocations();
  const fetchedAt = new Date().toISOString();
  if (!points.length) {
    db.hazards = db.hazards.filter((hazard) => hazard.source !== "Open-Meteo");
    io?.emit("hazards:feed:update", { source: "Open-Meteo", hazards: [], fetchedAt });
    state = { ...state, status: "waiting_for_active_ride", lastError: null, hazardCount: 0, coveredLocations: 0 };
    return [];
  }
  try {
    const incoming = [];
    for (const point of points) {
      const params = new URLSearchParams({
        latitude: String(point.lat), longitude: String(point.lng),
        current: "precipitation,rain,showers,weather_code,wind_speed_10m,wind_gusts_10m",
        timezone: "auto"
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}`);
      const payload = await response.json();
      const hazard = normalizeWeather(point, payload.current || {}, fetchedAt);
      if (hazard) incoming.push(hazard);
    }
    db.hazards = db.hazards.filter((hazard) => hazard.source !== "Open-Meteo").concat(incoming);
    io?.emit("hazards:feed:update", { source: "Open-Meteo", hazards: incoming, fetchedAt });
    for (const ride of db.rides.values()) {
      const coordinates = ride.plannedRoute?.geometry?.coordinates;
      if (!coordinates) continue;
      const affected = checkRouteHazards(coordinates, incoming).intersectingHazards;
      if (affected.length) io?.to(`ride:${ride.id}`).emit("ride:hazard:alert", { hazards: affected, timestamp: fetchedAt });
    }
    state = { enabled: true, status: "connected", lastSuccessAt: fetchedAt, lastError: null, hazardCount: incoming.length, coveredLocations: points.length };
    return incoming;
  } catch (error) {
    const message = error.message || "Weather request failed";
    if (state.lastError !== message) console.error("Open-Meteo weather feed error:", message);
    if (!state.lastSuccessAt || Date.now() - Date.parse(state.lastSuccessAt) > 20 * 60_000) {
      db.hazards = db.hazards.filter((hazard) => hazard.source !== "Open-Meteo");
      io?.emit("hazards:feed:update", { source: "Open-Meteo", hazards: [], fetchedAt: new Date().toISOString() });
    }
    state = { ...state, status: "error", lastError: message };
    return [];
  }
}

export function startOpenMeteoWeatherFeed(io) {
  if (timer) return;
  state = { ...state, status: "connecting" };
  void pollOpenMeteoWeather(io);
  timer = setInterval(() => void pollOpenMeteoWeather(io), POLL_MS);
  timer.unref?.();
}
