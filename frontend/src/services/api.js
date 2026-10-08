/**
 * Centralized Resilient API Client for ResilientUrban
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";
let authToken = localStorage.getItem("rider-token");

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem("rider-token", token);
  else localStorage.removeItem("rider-token");
}

async function safeFetch(url, options = {}) {
  try {
    const headers = { ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      try {
        return JSON.parse(errText);
      } catch {
        return { success: false, status: res.status, error: errText || res.statusText };
      }
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] Request failed for ${url}:`, err.message);
    return { success: false, error: err.message, networkError: true };
  }
}

export function authenticate(path, credentials) {
  return safeFetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
}

export async function fetchHealth() {
  return safeFetch(`${API_BASE}/health`);
}

// --- ROUTING ---
export async function calculateRoute({ origin, destination, waypoints = [], emergencyCorridor = false, simulatedHazards = [] }) {
  return safeFetch(`${API_BASE}/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, waypoints, emergencyCorridor, simulatedHazards })
  });
}

// --- RIDES ---
export async function createRide(rideData) {
  return safeFetch(`${API_BASE}/rides`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rideData)
  });
}

export async function joinRide(code) {
  return safeFetch(`${API_BASE}/rides/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
}

export async function fetchRideDetails(rideId) {
  return safeFetch(`${API_BASE}/rides/${rideId}`);
}

export async function fetchMyRide() {
  return safeFetch(`${API_BASE}/rides/mine`);
}

export async function leaveRideApi(rideId) {
  return safeFetch(`${API_BASE}/rides/${rideId}/leave`, { method: "POST" });
}

export async function requestRegroupApi(rideId) {
  return safeFetch(`${API_BASE}/rides/${rideId}/regroup`, {
    method: "POST"
  });
}

export async function applyRerouteApi(rideId, rerouteOption) {
  return safeFetch(`${API_BASE}/rides/${rideId}/reroute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rerouteOption })
  });
}

export async function toggleEmergencyCorridorApi(rideId, status = null) {
  return safeFetch(`${API_BASE}/rides/${rideId}/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

// --- HAZARDS & DISASTER ---
export async function fetchHazards() {
  return safeFetch(`${API_BASE}/hazards`);
}

export async function fetchRisk() {
  return safeFetch(`${API_BASE}/risk`);
}

export async function fetchEvents() {
  return safeFetch(`${API_BASE}/events`);
}

export async function toggleHazardApi(hazardId) {
  return safeFetch(`${API_BASE}/hazards/${hazardId}/toggle`, {
    method: "POST"
  });
}

export async function toggleEventApi(eventId) {
  return safeFetch(`${API_BASE}/events/${eventId}/toggle`, {
    method: "POST"
  });
}

// --- REPORTS ---
export async function fetchReports() {
  return safeFetch(`${API_BASE}/reports`);
}

export async function createReport(reportData) {
  return safeFetch(`${API_BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData)
  });
}

// --- EMERGENCY SOS ---
export async function fetchNearbyEmergencyAlerts(location, radiusMeters = 10000) {
  const params = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng), radiusMeters: String(radiusMeters) });
  return safeFetch(`${API_BASE}/emergency/nearby?${params}`);
}

export async function createEmergencyAlert({ rideId, location, message }) {
  return safeFetch(`${API_BASE}/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rideId, location, message })
  });
}

export async function acknowledgeEmergencyAlert(alertId) {
  return safeFetch(`${API_BASE}/emergency/${alertId}/acknowledge`, { method: "POST" });
}

export async function resolveEmergencyAlert(alertId) {
  return safeFetch(`${API_BASE}/emergency/${alertId}/resolve`, { method: "POST" });
}

// --- SIMULATION ---
export async function fetchSimulationState() {
  return safeFetch(`${API_BASE}/simulation/state`);
}

export async function simulationPlay() {
  return safeFetch(`${API_BASE}/simulation/play`, { method: "POST" });
}

export async function simulationPause() {
  return safeFetch(`${API_BASE}/simulation/pause`, { method: "POST" });
}

export async function simulationReset() {
  return safeFetch(`${API_BASE}/simulation/reset`, { method: "POST" });
}

export async function simulationStep() {
  return safeFetch(`${API_BASE}/simulation/step`, { method: "POST" });
}

export async function simulationSpeed(multiplier) {
  return safeFetch(`${API_BASE}/simulation/speed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ multiplier })
  });
}

export async function loadSimulationScenario(scenarioId) {
  return safeFetch(`${API_BASE}/simulation/scenario/${scenarioId}`, {
    method: "POST"
  });
}

export async function triggerRiderAction(action) {
  return safeFetch(`${API_BASE}/simulation/rider/${action}`, {
    method: "POST"
  });
}

// Backward-compatibility simulation triggers
export async function simulateHeavyRain() {
  return loadSimulationScenario(5);
}

export async function simulateRoadClosure() {
  return loadSimulationScenario(7);
}

export async function simulateCombinedDisaster() {
  return loadSimulationScenario(8);
}
