import { createHash } from "node:crypto";
import { db } from "../database/spatialStore.js";
import { checkRouteHazards } from "../routing/routingService.js";
import { calculateDistance } from "../geo/haversine.js";

const POLL_INTERVAL_MS = 60_000;
const LOCATION_MAX_AGE_MS = 2 * 60_000;
const ROUTE_SAMPLE_INTERVAL_METERS = 5_000;
const MAX_AREA_DIAMETER_METERS = 18_000;
const AREA_PADDING_METERS = 5_000;
const CATEGORY = {
  1: { type: "ACCIDENT", severity: 88 },
  2: { type: "LOW_VISIBILITY", severity: 60 },
  3: { type: "ROAD_HAZARD", severity: 72 },
  4: { type: "WEATHER_HAZARD", severity: 62 },
  5: { type: "ICE", severity: 75 },
  6: { type: "HEAVY_TRAFFIC", severity: 55 },
  7: { type: "LANE_CLOSED", severity: 72 },
  8: { type: "ROAD_CLOSED", severity: 95 },
  9: { type: "ROAD_WORKS", severity: 48 },
  10: { type: "WIND_HAZARD", severity: 60 },
  11: { type: "FLOODING", severity: 90 },
  14: { type: "BROKEN_DOWN_VEHICLE", severity: 68 }
};

let timer = null;
let state = { enabled: Boolean(process.env.TOMTOM_API_KEY), status: "not_started", lastSuccessAt: null, lastError: null, incidentCount: 0, activeRiderCount: 0, coverageAreaCount: 0 };

function getFreshRideLocations() {
  const now = Date.now();
  const activeRides = [];
  for (const ride of db.rides.values()) {
    const members = db.getRideMembers(ride.id).filter((member) => {
      const age = now - Date.parse(member.lastSeenAt || "");
      return member.lastLocation && Number.isFinite(member.lastLocation.lat) && Number.isFinite(member.lastLocation.lng) && age >= 0 && age <= LOCATION_MAX_AGE_MS;
    });
    const hasPlannedRoute = ride.status === "ACTIVE" && ride.plannedRoute?.geometry?.coordinates?.length > 1;
    if (members.length || hasPlannedRoute) activeRides.push({ ride, members });
  }
  return activeRides;
}

function getRouteCoveragePoints(coordinates = []) {
  if (!coordinates.length) return [];
  const points = [coordinates[0]];
  let lastPoint = coordinates[0];
  for (const coordinate of coordinates.slice(1)) {
    const distance = calculateDistance({ lng: lastPoint[0], lat: lastPoint[1] }, { lng: coordinate[0], lat: coordinate[1] });
    if (distance >= ROUTE_SAMPLE_INTERVAL_METERS) {
      points.push(coordinate);
      lastPoint = coordinate;
    }
  }
  const lastCoordinate = coordinates[coordinates.length - 1];
  if (points[points.length - 1] !== lastCoordinate) points.push(lastCoordinate);
  return points.map(([lng, lat]) => ({ lat, lng }));
}

function buildCoverageAreas(activeRides) {
  const points = [];
  for (const { ride, members } of activeRides) {
    members.forEach((member) => points.push({ lat: member.lastLocation.lat, lng: member.lastLocation.lng }));
    points.push(...getRouteCoveragePoints(ride.plannedRoute?.geometry?.coordinates));
  }

  const clusters = [];
  for (const point of points) {
    const cluster = clusters.find((candidate) => candidate.points.every((other) => calculateDistance(point, other) <= MAX_AREA_DIAMETER_METERS));
    if (cluster) cluster.points.push(point);
    else clusters.push({ points: [point] });
  }

  return clusters.map(({ points: areaPoints }) => {
    const latitude = areaPoints.reduce((sum, point) => sum + point.lat, 0) / areaPoints.length;
    const latPadding = AREA_PADDING_METERS / 111_320;
    const lngPadding = AREA_PADDING_METERS / (111_320 * Math.max(0.1, Math.cos(latitude * Math.PI / 180)));
    const west = Math.max(-180, Math.min(...areaPoints.map((point) => point.lng)) - lngPadding);
    const east = Math.min(180, Math.max(...areaPoints.map((point) => point.lng)) + lngPadding);
    const south = Math.max(-90, Math.min(...areaPoints.map((point) => point.lat)) - latPadding);
    const north = Math.min(90, Math.max(...areaPoints.map((point) => point.lat)) + latPadding);
    return { bbox: [west, south, east, north].map((value) => value.toFixed(5)).join(",") };
  });
}

function createIncidentParams(apiKey, bbox) {
  return new URLSearchParams({
    key: apiKey,
    bbox,
    language: "en-GB",
    timeValidityFilter: "present",
    fields: "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,probabilityOfOccurrence,numberOfReports,lastReportTime}}}"
  });
}

function getCoordinates(geometry) {
  const pairs = [];
  function visit(node) {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && Number.isFinite(node[0]) && Number.isFinite(node[1])) pairs.push([node[0], node[1]]);
    else node.forEach(visit);
  }
  visit(geometry?.coordinates);
  if (!pairs.length) return null;
  const middle = pairs[Math.floor(pairs.length / 2)];
  return { longitude: middle[0], latitude: middle[1] };
}

function normalizeIncident(incident, sourceUpdatedAt, fetchedAt) {
  const properties = incident.properties || {};
  const location = getCoordinates(incident.geometry);
  if (!location) return null;
  const category = CATEGORY[Number(properties.iconCategory)] || { type: "TRAFFIC_INCIDENT", severity: 55 };
  const severityByMagnitude = { 1: 45, 2: 62, 3: 82, 4: 95 };
  const severity = Math.max(category.severity, severityByMagnitude[Number(properties.magnitudeOfDelay)] || 0);
  const description = properties.events?.map((event) => event.description).filter(Boolean).join("; ") || properties.description || category.type.replaceAll("_", " ");
  const fingerprint = createHash("sha1").update(`${incident.type}:${location.longitude.toFixed(5)}:${location.latitude.toFixed(5)}:${category.type}`).digest("hex").slice(0, 12);
  const id = `TT-${properties.id || fingerprint}`;
  return {
    id,
    source: "TomTom Traffic",
    sourceId: String(properties.id || fingerprint),
    sourceUpdatedAt: sourceUpdatedAt || fetchedAt,
    fetchedAt,
    name: properties.from || properties.to || category.type.replaceAll("_", " "),
    corridor: "active rider area",
    type: category.type,
    severity,
    confidence: properties.probabilityOfOccurrence === "certain" ? 95 : 80,
    blocked: Number(properties.iconCategory) === 8,
    roadStatus: Number(properties.iconCategory) === 8 ? "BLOCKED" : severity >= 80 ? "CRITICAL" : "CONGESTED",
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: Number(properties.length) > 0 ? Math.min(900, Math.max(200, Number(properties.length) / 2)) : 350,
    active: true,
    description,
    delaySeconds: Number(properties.delay) || 0,
    startedAt: properties.startTime || null,
    estimatedEndAt: properties.endTime || null
  };
}

export function getTomTomTrafficStatus() {
  return {
    ...state,
    coverage: "Traffic incidents within sampled areas around active planned routes and recent shared GPS.",
    setupMessage: process.env.TOMTOM_API_KEY ? null : "Set TOMTOM_API_KEY in backend/.env to enable traffic and localized event lookup."
  };
}

export async function pollTomTomTraffic(io) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    state = { ...state, enabled: false, status: "disabled", lastError: "TOMTOM_API_KEY is not configured" };
    return [];
  }

  try {
    const activeRides = getFreshRideLocations();
    const areas = buildCoverageAreas(activeRides);
    const fetchedAt = new Date().toISOString();
    if (!areas.length) {
      db.hazards = db.hazards.filter((hazard) => hazard.source !== "TomTom Traffic");
      if (io) io.emit("traffic:incidents:update", { hazards: [], fetchedAt, sourceUpdatedAt: fetchedAt });
      state = { enabled: true, status: "waiting_for_active_ride", lastSuccessAt: state.lastSuccessAt, lastError: null, incidentCount: 0, activeRiderCount: 0, coverageAreaCount: 0 };
      return [];
    }

    const responses = [];
    for (const area of areas) {
      const params = createIncidentParams(apiKey, area.bbox);
      const response = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 400);
        throw new Error(`TomTom returned HTTP ${response.status}${details ? `: ${details}` : ""}`);
      }
      const payload = await response.json();
      console.log("[TomTom] Incident Details API response:", JSON.stringify(payload, null, 2));
      responses.push(payload);
    }

    const incomingById = new Map();
    for (const payload of responses) {
      for (const incident of payload.incidents || []) {
        const normalized = normalizeIncident(incident, payload.sourceUpdated, fetchedAt);
        if (normalized) incomingById.set(normalized.id, normalized);
      }
    }
    const incoming = Array.from(incomingById.values());
    const oldIds = new Set(db.hazards.filter((hazard) => hazard.source === "TomTom Traffic").map((hazard) => hazard.id));
    db.hazards = db.hazards.filter((hazard) => hazard.source !== "TomTom Traffic").concat(incoming);
    const added = incoming.filter((hazard) => !oldIds.has(hazard.id));

    if (io) {
      io.emit("traffic:incidents:update", { hazards: incoming, fetchedAt, sourceUpdatedAt: responses.map((payload) => payload.sourceUpdated).filter(Boolean).sort().at(-1) || fetchedAt });
      if (added.length) {
        for (const ride of db.rides.values()) {
          const coordinates = ride.plannedRoute?.geometry?.coordinates;
          if (!coordinates) continue;
          const affected = checkRouteHazards(coordinates, added).intersectingHazards;
          if (affected.length) io.to(`ride:${ride.id}`).emit("ride:hazard:alert", { hazards: affected, timestamp: fetchedAt });
        }
      }
    }

    state = { enabled: true, status: "connected", lastSuccessAt: fetchedAt, lastError: null, incidentCount: incoming.length, activeRiderCount: activeRides.reduce((count, entry) => count + entry.members.length, 0), coverageAreaCount: areas.length };
    return incoming;
  } catch (error) {
    const message = error.message || "TomTom request failed";
    const isNewError = state.lastError !== message;
    state = { ...state, enabled: true, status: "error", lastError: message };
    if (isNewError) console.error("TomTom traffic feed error:", message);
    if (!state.lastSuccessAt || Date.now() - Date.parse(state.lastSuccessAt) > 3 * POLL_INTERVAL_MS) {
      db.hazards = db.hazards.filter((hazard) => hazard.source !== "TomTom Traffic");
      io?.emit("traffic:incidents:update", { hazards: [], fetchedAt: new Date().toISOString() });
    }
    return [];
  }
}

export function startTomTomTrafficFeed(io) {
  if (!process.env.TOMTOM_API_KEY || timer) return;
  state = { ...state, enabled: true, status: "connecting", lastError: null };
  void pollTomTomTraffic(io);
  timer = setInterval(() => void pollTomTomTraffic(io), POLL_INTERVAL_MS);
  timer.unref?.();
}
