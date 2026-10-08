import { db } from "../database/spatialStore.js";
import { calculateDistance } from "../geo/haversine.js";

const POLL_MS = 15 * 60_000;
const ROUTE_ALERT_RADIUS_METERS = 2_000;
let timer;
const lastRouteAlertAt = new Map();
let state = {
  enabled: true,
  status: "not_started",
  lastSuccessAt: null,
  lastError: null,
  eventCount: 0,
  coveredLocations: 0,
  coverage: "Public listings from Ticket Fairy only; event coverage varies by market and does not confirm attendance or road closures."
};

function sampleRoute(coordinates, count) {
  if (!coordinates.length) return [];
  if (coordinates.length <= count) return coordinates;
  return Array.from({ length: count }, (_, index) => coordinates[Math.round(index * (coordinates.length - 1) / (count - 1))]);
}

function activeLocations() {
  const now = Date.now();
  const points = [];
  for (const ride of db.rides.values()) {
    for (const member of db.getRideMembers(ride.id)) {
      const age = now - Date.parse(member.lastSeenAt || "");
      if (member.lastLocation && age >= 0 && age < 2 * 60_000) points.push(member.lastLocation);
    }
    if (ride.status === "ACTIVE") {
      if (Number.isFinite(ride.startLocation?.lat) && Number.isFinite(ride.startLocation?.lng)) points.push(ride.startLocation);
      sampleRoute(ride.plannedRoute?.geometry?.coordinates || [], 8)
        .forEach(([lng, lat]) => points.push({ lat, lng }));
    }
  }
  return points.filter((point, index) => points.findIndex((other) => calculateDistance(point, other) < 10_000) === index).slice(0, 8);
}

async function countryForPoint(point, apiKey) {
  const response = await fetch(
    `https://api.tomtom.com/search/2/reverseGeocode/${point.lat},${point.lng}.json?key=${encodeURIComponent(apiKey)}&entityType=Country`,
    { signal: AbortSignal.timeout(12_000) }
  );
  if (!response.ok) throw new Error(`TomTom country lookup returned HTTP ${response.status}`);
  const payload = await response.json();
  const countryCode = payload.addresses?.[0]?.address?.countryCode;
  return typeof countryCode === "string" && /^[A-Z]{2}$/.test(countryCode) ? countryCode.toLowerCase() : null;
}

function normalizeEvent(event, fetchedAt) {
  const venue = event.venue || {};
  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const startTime = event.startDate || null;
  const endTime = event.endDate || null;
  const startMs = startTime ? Date.parse(startTime) : NaN;
  if (Number.isFinite(startMs) && (startMs > Date.now() + 24 * 60 * 60_000 || startMs < Date.now() - 6 * 60 * 60_000)) return null;
  const name = event.displayName || event.subtitle || venue.name || "Public event listing";
  return {
    id: `TF-${event.id || event.url || `${latitude.toFixed(5)}-${longitude.toFixed(5)}-${startTime || "unknown"}`}`,
    sourceId: event.id || event.url || null,
    source: "Ticket Fairy Public Events",
    sourceUrl: event.url || null,
    type: "PUBLIC_EVENT",
    name,
    description: `Ticket Fairy listing${venue.name ? ` at ${venue.name}` : ""}. Possible local demand only; attendance and road impact are unknown.`,
    venue: venue.name || null,
    latitude,
    longitude,
    startTime,
    endTime,
    radiusMeters: ROUTE_ALERT_RADIUS_METERS,
    status: "ACTIVE",
    sourceUpdatedAt: event.updatedAt || startTime || fetchedAt,
    fetchedAt,
    trafficSignalOnly: true
  };
}

export function getTicketFairyFeedStatus() {
  const tomtomConfigured = Boolean(process.env.TOMTOM_API_KEY);
  return {
    ...state,
    enabled: true,
    status: tomtomConfigured ? state.status : "waiting_for_location_provider",
    setupMessage: tomtomConfigured ? null : "Set TOMTOM_API_KEY to determine the active ride's country for localized event listings."
  };
}

export async function pollTicketFairyEvents(io) {
  const tomtomKey = process.env.TOMTOM_API_KEY;
  if (!tomtomKey) {
    state = { ...state, status: "waiting_for_location_provider", lastError: null, eventCount: 0, coveredLocations: 0 };
    return [];
  }
  const points = activeLocations();
  const fetchedAt = new Date().toISOString();
  if (!points.length) {
    db.events = db.events.filter((event) => event.source !== "Ticket Fairy Public Events");
    io?.emit("events:feed:update", { source: "Ticket Fairy Public Events", events: [], fetchedAt });
    state = { ...state, status: "waiting_for_active_ride", lastError: null, eventCount: 0, coveredLocations: 0 };
    return [];
  }
  try {
    const countryCodes = new Set();
    for (const point of points) {
      const countryCode = await countryForPoint(point, tomtomKey);
      if (countryCode) countryCodes.add(countryCode);
    }
    if (!countryCodes.size) throw new Error("Could not determine a country for the active ride locations.");

    const eventsById = new Map();
    for (const country of countryCodes) {
      for (const sectionType of ["current", "upcoming"]) {
        const params = new URLSearchParams({
          country,
          section_type: sectionType,
          from: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
          to: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          timezone: "UTC",
          sort: "start_date",
          order: "asc",
          size: "200"
        });
        const response = await fetch(`https://www.ticketfairy.com/api/v1/events/listing?${params}`, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`Ticket Fairy returned HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload.success || !Array.isArray(payload.data?.events)) throw new Error("Ticket Fairy returned an invalid event listing.");
        for (const event of payload.data.events) {
          const normalized = normalizeEvent(event, fetchedAt);
          if (normalized && points.some((point) => calculateDistance(point, { lat: normalized.latitude, lng: normalized.longitude }) <= 25_000)) {
            eventsById.set(normalized.id, normalized);
          }
        }
      }
    }

    const incoming = [...eventsById.values()];
    db.events = db.events.filter((event) => event.source !== "Ticket Fairy Public Events").concat(incoming);
    state = { ...state, enabled: true, status: "connected", lastSuccessAt: fetchedAt, lastError: null, eventCount: incoming.length, coveredLocations: points.length, coveredCountries: [...countryCodes] };
    io?.emit("events:feed:update", { source: "Ticket Fairy Public Events", events: incoming, fetchedAt });
    const now = Date.now();
    for (const ride of db.rides.values()) {
      const coordinates = ride.plannedRoute?.geometry?.coordinates;
      if (ride.status !== "ACTIVE" || !coordinates?.length) continue;
      const routeEvents = incoming.filter((event) => coordinates.some(([lng, lat]) =>
        calculateDistance({ lat, lng }, { lat: event.latitude, lng: event.longitude }) <= event.radiusMeters
      ));
      const unannounced = routeEvents.filter((event) => now - (lastRouteAlertAt.get(`${ride.id}:${event.id}`) || 0) > 3 * 60 * 60_000);
      if (unannounced.length) {
        io?.to(`ride:${ride.id}`).emit("ride:event:alert", { rideId: ride.id, events: unannounced, timestamp: fetchedAt });
        unannounced.forEach((event) => lastRouteAlertAt.set(`${ride.id}:${event.id}`, now));
      }
    }
    for (const [key, lastAlertAt] of lastRouteAlertAt) {
      if (now - lastAlertAt > 7 * 24 * 60 * 60_000) lastRouteAlertAt.delete(key);
    }
    return incoming;
  } catch (error) {
    const message = error.message || "Ticket Fairy event request failed";
    if (state.lastError !== message) console.error("Ticket Fairy public events feed error:", message);
    if (!state.lastSuccessAt || Date.now() - Date.parse(state.lastSuccessAt) > 45 * 60_000) {
      db.events = db.events.filter((event) => event.source !== "Ticket Fairy Public Events");
      io?.emit("events:feed:update", { source: "Ticket Fairy Public Events", events: [], fetchedAt: new Date().toISOString() });
    }
    state = { ...state, enabled: true, status: "error", lastError: message };
    return [];
  }
}

export function startTicketFairyEventsFeed(io) {
  if (timer) return;
  state = { ...state, status: "connecting" };
  void pollTicketFairyEvents(io);
  timer = setInterval(() => void pollTicketFairyEvents(io), POLL_MS);
  timer.unref?.();
}
