/**
 * Geospatial Haversine & Bearing Utilities
 */

const EARTH_RADIUS_METERS = 6371000;

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Computes great-circle distance between two [lng, lat] or {lat, lng} coordinates in meters.
 */
export function calculateDistance(coord1, coord2) {
  const p1 = Array.isArray(coord1) ? { lng: coord1[0], lat: coord1[1] } : coord1;
  const p2 = Array.isArray(coord2) ? { lng: coord2[0], lat: coord2[1] } : coord2;

  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Calculates bearing from start point to end point in degrees (0 - 360)
 */
export function calculateBearing(coord1, coord2) {
  const p1 = Array.isArray(coord1) ? { lng: coord1[0], lat: coord1[1] } : coord1;
  const p2 = Array.isArray(coord2) ? { lng: coord2[0], lat: coord2[1] } : coord2;

  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}

/**
 * Determines whether a rider is ahead or behind relative to user position & heading
 */
export function getRelativePosition(userCoord, userHeading, otherCoord, userSpeedMps = 10) {
  const distance = calculateDistance(userCoord, otherCoord);
  const bearingToOther = calculateBearing(userCoord, otherCoord);

  // If user has no heading, default to 0
  const heading = userHeading !== undefined && userHeading !== null ? userHeading : 0;
  let angleDiff = (bearingToOther - heading + 360) % 360;
  if (angleDiff > 180) angleDiff -= 360;

  // Ahead if within +/- 90 degrees of travel heading
  const isAhead = Math.abs(angleDiff) <= 90;

  // Estimate ETA in minutes (minimum speed assumed 25 km/h ~ 7 m/s)
  const speed = Math.max(userSpeedMps, 7);
  const etaMinutes = Math.max(1, Math.round(distance / speed / 60));

  let distanceFormatted = "";
  if (distance < 1000) {
    distanceFormatted = `${distance} m`;
  } else {
    distanceFormatted = `${(distance / 1000).toFixed(1)} km`;
  }

  return {
    distanceMeters: distance,
    distanceFormatted,
    isAhead,
    relativeLabel: isAhead ? `${distanceFormatted} ahead` : `${distanceFormatted} behind`,
    etaMinutes,
    bearing: bearingToOther
  };
}
