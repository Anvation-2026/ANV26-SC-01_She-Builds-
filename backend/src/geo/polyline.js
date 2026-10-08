/**
 * Polyline Route Corridor & Deviation Utilities
 */

import { calculateDistance, toRadians } from "./haversine.js";

/**
 * Projects a point onto a line segment and calculates the shortest distance in meters
 */
function distanceToSegment(point, segStart, segEnd) {
  const p = Array.isArray(point) ? { lng: point[0], lat: point[1] } : point;
  const a = Array.isArray(segStart) ? { lng: segStart[0], lat: segStart[1] } : segStart;
  const b = Array.isArray(segEnd) ? { lng: segEnd[0], lat: segEnd[1] } : segEnd;

  // Approximate flat-earth projection for short segments
  const avgLat = toRadians((a.lat + b.lat) / 2);
  const cosLat = Math.cos(avgLat);

  const x = (p.lng - a.lng) * 111320 * cosLat;
  const y = (p.lat - a.lat) * 110540;

  const dx = (b.lng - a.lng) * 111320 * cosLat;
  const dy = (b.lat - a.lat) * 110540;

  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return calculateDistance(p, a);
  }

  // Parameter t of projection onto line segment [0, 1]
  const t = Math.max(0, Math.min(1, (x * dx + y * dy) / lenSq));
  const projX = a.lng + (t * (b.lng - a.lng));
  const projLat = a.lat + (t * (b.lat - a.lat));

  return calculateDistance(p, { lng: projX, lat: projLat });
}

/**
 * Computes shortest distance from point to a route polyline (array of [lng, lat])
 */
export function distanceFromRoute(point, polylineCoordinates) {
  if (!polylineCoordinates || polylineCoordinates.length < 2) {
    return 0;
  }

  let minDistance = Infinity;
  for (let i = 0; i < polylineCoordinates.length - 1; i++) {
    const dist = distanceToSegment(point, polylineCoordinates[i], polylineCoordinates[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return Math.round(minDistance);
}

/**
 * Configurable Route Corridor Thresholds:
 * NORMAL: < 100m
 * WARNING: 100m - 300m
 * OFF_ROUTE: > 300m
 * CRITICAL: > 1000m
 */
export function checkRouteDeviation(distanceMeters, thresholds = { warning: 100, offRoute: 300, critical: 1000 }) {
  if (distanceMeters < thresholds.warning) {
    return {
      status: "NORMAL",
      isOffRoute: false,
      severity: "NONE",
      distance: distanceMeters,
      message: "On planned route"
    };
  }
  if (distanceMeters < thresholds.offRoute) {
    return {
      status: "WARNING",
      isOffRoute: false,
      severity: "LOW",
      distance: distanceMeters,
      message: `Moving away from route (${distanceMeters}m)`
    };
  }
  if (distanceMeters < thresholds.critical) {
    return {
      status: "OFF_ROUTE",
      isOffRoute: true,
      severity: "MEDIUM",
      distance: distanceMeters,
      message: `Off planned route by ${distanceMeters}m`
    };
  }
  return {
    status: "CRITICAL",
    isOffRoute: true,
    severity: "HIGH",
    distance: distanceMeters,
    message: `Critical route deviation (${(distanceMeters / 1000).toFixed(1)} km away)`
  };
}
