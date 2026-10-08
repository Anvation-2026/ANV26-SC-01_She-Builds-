/**
 * Crowdsourced Hazard Reports
 */

export const initialReports = [
  {
    id: "REP-101",
    type: "FLOODING",
    description: "Water level rising rapidly past knee depth near Richmond flyover ramp.",
    latitude: 12.9575,
    longitude: 77.5985,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    trustScore: 85,
    gpsVerified: true
  },
  {
    id: "REP-102",
    type: "ROAD_BLOCKED",
    description: "Tree branch fallen blocking both northbound lanes near Adugodi signal.",
    latitude: 12.9435,
    longitude: 77.6115,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    trustScore: 80,
    gpsVerified: true
  }
];

export function calculateTrustScore({ hasRecentTimestamp = true, hasGps = true, hasDetails = true }) {
  let score = 50;
  if (hasRecentTimestamp) score += 20;
  if (hasGps) score += 15;
  if (hasDetails) score += 15;
  return Math.min(100, Math.max(0, score));
}
