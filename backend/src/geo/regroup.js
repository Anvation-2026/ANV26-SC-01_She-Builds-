/**
 * Regroup Point Recommendation Engine
 * Recommends safe regrouping locations when riders become separated
 */

import { calculateDistance } from "./haversine.js";

// Safe known public assembly & regrouping POIs in Bengaluru
const SAFE_REGROUP_POIS = [
  { name: "Cubbon Park Gate 2 Parking", lat: 12.9735, lng: 77.5960, capacity: 50, type: "PARKING" },
  { name: "Richmond Circle Service Road Safe Bay", lat: 12.9605, lng: 77.5980, capacity: 30, type: "SERVICE_BAY" },
  { name: "National Dairy Research Institute (NDRI) Open Plaza", lat: 12.9460, lng: 77.6180, capacity: 40, type: "PLAZA" },
  { name: "Koramangala 4th Block BDA Complex Parking", lat: 12.9340, lng: 77.6270, capacity: 60, type: "PUBLIC_PARKING" },
  { name: "Domlur Flyover Underpass Regroup Bay", lat: 12.9625, lng: 77.6375, capacity: 35, type: "TRANSIT_BAY" },
  { name: "Indiranagar Metro Station Concourse", lat: 12.9785, lng: 77.6405, capacity: 45, type: "METRO_CONCOURSE" }
];

export function calculateRegroupPoint(riders, plannedRouteCoordinates = []) {
  const validRiders = (riders || []).filter(r => r.location && r.location.lat && r.location.lng);

  // 1. Calculate centroid from active riders, or fallback to route midpoint / central POI
  let centroid = null;
  if (validRiders.length > 0) {
    let sumLat = 0;
    let sumLng = 0;
    validRiders.forEach(r => {
      sumLat += r.location.lat;
      sumLng += r.location.lng;
    });
    centroid = {
      lat: sumLat / validRiders.length,
      lng: sumLng / validRiders.length
    };
  } else if (plannedRouteCoordinates && plannedRouteCoordinates.length > 0) {
    const midIdx = Math.floor(plannedRouteCoordinates.length / 2);
    centroid = {
      lat: plannedRouteCoordinates[midIdx][1],
      lng: plannedRouteCoordinates[midIdx][0]
    };
  } else {
    centroid = { lat: SAFE_REGROUP_POIS[0].lat, lng: SAFE_REGROUP_POIS[0].lng };
  }

  // 2. Find nearest POI to centroid, or use nearest point along planned route
  let bestPoint = null;
  let minPoiDist = Infinity;

  for (const poi of SAFE_REGROUP_POIS) {
    const dist = calculateDistance(centroid, poi);
    if (dist < minPoiDist) {
      minPoiDist = dist;
      bestPoint = {
        name: poi.name,
        type: poi.type,
        location: { lat: poi.lat, lng: poi.lng },
        distanceFromCentroidMeters: dist
      };
    }
  }

  // If planned route coordinates available and closer, snap to route coordinate
  if (plannedRouteCoordinates && plannedRouteCoordinates.length > 0) {
    let minRouteDist = Infinity;
    let closestRoutePoint = null;

    for (const coord of plannedRouteCoordinates) {
      const p = { lng: coord[0], lat: coord[1] };
      const dist = calculateDistance(centroid, p);
      if (dist < minRouteDist) {
        minRouteDist = dist;
        closestRoutePoint = p;
      }
    }

    if (closestRoutePoint && minRouteDist < minPoiDist) {
      bestPoint = {
        name: "Route Midpoint Assembly Zone",
        type: "ROUTE_WAYPOINT",
        location: { lat: closestRoutePoint.lat, lng: closestRoutePoint.lng },
        distanceFromCentroidMeters: minRouteDist
      };
    }
  }

  // 3. Compute convergence time (max distance from any rider / avg speed 25 km/h ~ 7 m/s)
  let maxRiderDist = validRiders.length > 0 ? 0 : 800;
  validRiders.forEach(r => {
    const d = calculateDistance(r.location, bestPoint.location);
    if (d > maxRiderDist) maxRiderDist = d;
  });

  const estimatedConvergenceMinutes = Math.max(2, Math.round(maxRiderDist / 7 / 60));

  return {
    success: true,
    regroupPoint: {
      name: bestPoint.name,
      type: bestPoint.type,
      lat: bestPoint.location.lat,
      lng: bestPoint.location.lng,
      distanceMeters: maxRiderDist,
      distanceFormatted: maxRiderDist >= 1000 ? `${(maxRiderDist / 1000).toFixed(1)} km` : `${maxRiderDist} m`,
      estimatedConvergenceMinutes,
      convergenceMessage: `Estimated group convergence: ${estimatedConvergenceMinutes} minutes`
    }
  };
}
