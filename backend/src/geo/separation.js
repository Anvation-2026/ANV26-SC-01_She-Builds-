/**
 * Group Separation Detection
 * Thresholds:
 * < 1 km: GROUPED
 * 1 - 3 km: SPREAD_OUT
 * 3 - 5 km: SEPARATED
 * > 5 km: CRITICAL_SEPARATION
 */

import { calculateDistance } from "./haversine.js";

export function evaluateGroupSeparation(riders) {
  if (!riders || riders.length < 2) {
    return {
      status: "GROUPED",
      maxSeparationMeters: 0,
      separatedRiders: [],
      message: "All riders together"
    };
  }

  // Calculate reference centroid of riders
  let sumLat = 0;
  let sumLng = 0;
  let validCount = 0;

  riders.forEach(r => {
    if (r.location && r.location.lat && r.location.lng) {
      sumLat += r.location.lat;
      sumLng += r.location.lng;
      validCount++;
    }
  });

  if (validCount < 2) {
    return {
      status: "GROUPED",
      maxSeparationMeters: 0,
      separatedRiders: [],
      message: "Insufficient active positions"
    };
  }

  const centroid = { lat: sumLat / validCount, lng: sumLng / validCount };

  let maxDist = 0;
  const separatedRiders = [];

  riders.forEach(r => {
    if (r.location && r.location.lat && r.location.lng) {
      const dist = calculateDistance(r.location, centroid);
      if (dist > maxDist) maxDist = dist;

      if (dist >= 1000) {
        separatedRiders.push({
          userId: r.userId,
          name: r.name,
          distanceFromCentroid: dist,
          distanceFormatted: dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist}m`
        });
      }
    }
  });

  let status = "GROUPED";
  let message = "Group is moving cohesively";

  if (maxDist >= 5000) {
    status = "CRITICAL_SEPARATION";
    message = `Critical group separation: Riders spread ${(maxDist / 1000).toFixed(1)} km apart`;
  } else if (maxDist >= 3000) {
    status = "SEPARATED";
    message = `Group is separated (${(maxDist / 1000).toFixed(1)} km gap). Consider regrouping.`;
  } else if (maxDist >= 1000) {
    status = "SPREAD_OUT";
    message = `Group is moderately spread out (${(maxDist / 1000).toFixed(1)} km span)`;
  }

  return {
    status,
    maxSeparationMeters: maxDist,
    centroid,
    separatedRiders,
    message
  };
}
