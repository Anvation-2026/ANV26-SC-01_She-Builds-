/**
 * Proximity Notification Tracker
 * Thresholds: 2000m, 1000m, 500m, 200m, 50m (joined)
 * Prevents spamming by tracking threshold triggers
 */

export const PROXIMITY_THRESHOLDS = [
  { threshold: 2000, message: "is 2 km away" },
  { threshold: 1000, message: "is 1 km away" },
  { threshold: 500, message: "is 500 m away" },
  { threshold: 200, message: "is approaching (200m)" },
  { threshold: 50, message: "has joined the group" }
];

export function checkProximityAlerts(riderId, distanceMeters, riderName, proximityState = {}) {
  // proximityState: { [threshold]: boolean }
  const alerts = [];

  for (const item of PROXIMITY_THRESHOLDS) {
    if (distanceMeters <= item.threshold) {
      if (!proximityState[item.threshold]) {
        // Trigger alert for this threshold
        alerts.push({
          riderId,
          threshold: item.threshold,
          message: `${riderName} ${item.message}`,
          timestamp: Date.now()
        });
        proximityState[item.threshold] = true;
      }
    } else {
      // If rider moves further away, reset lower thresholds so they can retrigger later
      if (distanceMeters > item.threshold * 1.3) {
        proximityState[item.threshold] = false;
      }
    }
  }

  return { alerts, updatedState: proximityState };
}
