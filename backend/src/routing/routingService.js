/**
 * Routing Service & Disaster-Aware Multi-Option Reroute Planner
 */

import { queryOSRMRoute } from "./osrmClient.js";
import { queryTomTomRoutes } from "./tomtomRoutingClient.js";
import { calculateDistance } from "../geo/haversine.js";
import { db } from "../database/spatialStore.js";

/**
 * Checks if a route line intersects any active hazards
 */
export function checkRouteHazards(coordinates, activeHazards) {
  if (!coordinates || !activeHazards || activeHazards.length === 0) {
    return { isCompromised: false, intersectingHazards: [], maxSeverity: 0 };
  }

  const intersectingHazards = [];
  let maxSeverity = 0;

  for (const hazard of activeHazards) {
    const hazardPt = { lat: hazard.latitude, lng: hazard.longitude };
    const radius = hazard.radiusMeters || 600;

    const hits = coordinates.some(coord => {
      const pt = { lng: coord[0], lat: coord[1] };
      return calculateDistance(pt, hazardPt) <= radius;
    });

    if (hits) {
      intersectingHazards.push(hazard);
      if (hazard.severity > maxSeverity) maxSeverity = hazard.severity;
    }
  }

  return {
    isCompromised: intersectingHazards.length > 0,
    intersectingHazards,
    maxSeverity
  };
}

/**
 * Calculates primary route and, if hazards detected, generates multi-option alternatives:
 * - FASTEST
 * - SAFEST
 * - BALANCED
 */
export async function calculateDisasterAwareRoute({
  origin,
  destination,
  waypoints = [],
  emergencyCorridor = false,
  simulatedHazards = []
}) {
  const startCoord = Array.isArray(origin) ? origin : [origin.lng, origin.lat];
  const endCoord = Array.isArray(destination) ? destination : [destination.lng, destination.lat];
  const midWaypoints = waypoints.map(w => Array.isArray(w) ? w : [w.lng, w.lat]);
  const primaryWaypoints = [startCoord, ...midWaypoints, endCoord];
  const tomTomRoutes = await queryTomTomRoutes(primaryWaypoints);
  const routeProvider = tomTomRoutes ? "TOMTOM" : "OSRM";
  const rawRoutes = tomTomRoutes || await queryOSRMRoute(primaryWaypoints, { alternatives: true, steps: false });
  if (!rawRoutes?.length) throw new Error("No routing provider returned a route");

  const activeHazards = [
    ...db.hazards.filter(h => h.active),
    ...simulatedHazards.filter(h => h.active)
  ];
  const candidates = rawRoutes.map((route, index) => {
    const hazardCheck = checkRouteHazards(route.geometry.coordinates, activeHazards);
    const riskLevel = hazardCheck.maxSeverity >= 85 ? "CRITICAL"
      : hazardCheck.maxSeverity >= 60 ? "HIGH"
        : hazardCheck.maxSeverity > 0 ? "MODERATE" : "LOW";
    const feature = {
      type: "Feature",
      properties: {
        id: `route-${index + 1}`,
        name: `${routeProvider === "TOMTOM" ? "TomTom Traffic" : "OSRM"} route ${index + 1}`,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
        etaMinutes: Math.round(route.duration / 60),
        distanceKm: (route.distance / 1000).toFixed(1),
        trafficDelaySeconds: route.trafficDelaySeconds || 0,
        routeProvider,
        trafficAware: routeProvider === "TOMTOM",
        riskScore: hazardCheck.maxSeverity,
        riskLevel
      },
      geometry: route.geometry
    };
    return { route, feature, hazardCheck };
  });

  const fastest = [...candidates].sort((a, b) => a.route.duration - b.route.duration)[0];
  const safetyOrder = (a, b) => a.hazardCheck.maxSeverity - b.hazardCheck.maxSeverity
    || a.hazardCheck.intersectingHazards.length - b.hazardCheck.intersectingHazards.length
    || a.route.duration - b.route.duration;
  const safetyRanked = [...candidates].sort(safetyOrder);
  const safestCandidate = safetyRanked[0];
  const safest = safestCandidate === fastest
    ? safetyRanked.find((candidate) => candidate !== fastest
      && candidate.hazardCheck.maxSeverity === fastest.hazardCheck.maxSeverity
      && candidate.hazardCheck.intersectingHazards.length === fastest.hazardCheck.intersectingHazards.length) || fastest
    : safestCandidate;
  const targetDuration = (fastest.route.duration + safest.route.duration) / 2;
  const balanced = [...candidates].sort((a, b) =>
    Math.abs(a.route.duration - targetDuration) - Math.abs(b.route.duration - targetDuration)
    || safetyOrder(a, b)
  ).find((candidate) => candidate !== fastest && candidate !== safest)
    || candidates.find((candidate) => candidate !== fastest && candidate !== safest)
    || fastest;

  const toOption = (candidate, id, label, color) => {
    const hazardCount = candidate.hazardCheck.intersectingHazards.length;
    return {
      id,
      label,
      badge: candidate.feature.properties.trafficAware ? "TomTom live traffic" : "OSRM fallback (no live traffic)",
      description: hazardCount
        ? `This route intersects ${hazardCount} active hazard${hazardCount === 1 ? "" : "s"}.`
        : "No active reported hazards intersect this route.",
      distanceKm: candidate.feature.properties.distanceKm,
      etaMinutes: candidate.feature.properties.etaMinutes,
      trafficDelaySeconds: candidate.feature.properties.trafficDelaySeconds,
      hazardCount,
      riskScore: candidate.hazardCheck.maxSeverity,
      riskLevel: candidate.feature.properties.riskLevel,
      routeProvider,
      color,
      geometry: candidate.route.geometry
    };
  };

  const fastestOption = toOption(fastest, "fastest", "FASTEST", "#10b981");
  const safestOption = toOption(safest, "safest", "SAFEST", "#06b6d4");
  const balancedOption = toOption(balanced, "balanced", "BALANCED", "#8b5cf6");
  const primaryRoute = fastest.feature;
  const isCompromised = fastest.hazardCheck.intersectingHazards.length > 0;

  return {
    status: isCompromised ? "REROUTE_RECOMMENDED" : "OPTIMAL",
    primaryRoute,
    routeProvider,
    trafficAware: routeProvider === "TOMTOM",
    hasDisasterRisk: isCompromised,
    intersectingHazards: fastest.hazardCheck.intersectingHazards,
    alternatives: {
      fastest: fastestOption,
      safest: safestOption,
      balanced: balancedOption
    },
    recommended: isCompromised ? "safest" : "fastest",
    emergencyCorridorActive: emergencyCorridor
  };
}
