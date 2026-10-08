/**
 * Multi-Factor Disaster Risk Engine
 * Computes deterministic environmental & infrastructural road risk
 * Configurable weights: rainfall, elevation, traffic, events, community reports, historical risk
 */

export const DEFAULT_RISK_WEIGHTS = {
  rainfall: 0.35,
  elevation: 0.15,
  traffic: 0.20,
  events: 0.15,
  reports: 0.10,
  historical: 0.05
};

export const ROAD_STATUS_LEVELS = {
  SAFE: { min: 0, max: 25, label: "SAFE", color: "#10b981" },
  CONGESTED: { min: 26, max: 45, label: "CONGESTED", color: "#38bdf8" },
  AT_RISK: { min: 46, max: 65, label: "AT_RISK", color: "#facc15" },
  HAZARDOUS: { min: 66, max: 80, label: "HAZARDOUS", color: "#fb923c" },
  CRITICAL: { min: 81, max: 94, label: "CRITICAL", color: "#ef4444" },
  BLOCKED: { min: 95, max: 100, label: "BLOCKED", color: "#b91c1c" }
};

export function classifyRoadStatus(score, isBlocked = false) {
  if (isBlocked || score >= 95) return "BLOCKED";
  if (score >= 81) return "CRITICAL";
  if (score >= 66) return "HAZARDOUS";
  if (score >= 46) return "AT_RISK";
  if (score >= 26) return "CONGESTED";
  return "SAFE";
}

export function computeSegmentRisk({
  rainfallMm = 12,        // 0 - 100+ mm/hr
  elevationVulnerability = 40, // 0 - 100 (low-lying underpasses have high vulnerability)
  trafficPercent = 35,    // 0 - 100%
  eventCrowdDensity = 0,  // 0 - 100%
  reportSeverity = 0,     // 0 - 100
  historicalRisk = 30,    // 0 - 100
  isBlocked = false,
  weights = DEFAULT_RISK_WEIGHTS
}) {
  if (isBlocked) {
    return {
      score: 100,
      status: "BLOCKED",
      isPassable: false,
      breakdown: { blocked: true }
    };
  }

  // Normalize rainfall score: 0 mm/hr -> 0, 80+ mm/hr -> 100
  const rainfallScore = Math.min(100, Math.round((rainfallMm / 80) * 100));
  const elevationScore = Math.min(100, Math.max(0, elevationVulnerability));
  const trafficScore = Math.min(100, Math.max(0, trafficPercent));
  const eventScore = Math.min(100, Math.max(0, eventCrowdDensity));
  const reportScore = Math.min(100, Math.max(0, reportSeverity));
  const historyScore = Math.min(100, Math.max(0, historicalRisk));

  const rawScore =
    rainfallScore * weights.rainfall +
    elevationScore * weights.elevation +
    trafficScore * weights.traffic +
    eventScore * weights.events +
    reportScore * weights.reports +
    historyScore * weights.historical;

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const status = classifyRoadStatus(score, false);

  return {
    score,
    status,
    isPassable: score < 90,
    breakdown: {
      rainfallScore,
      elevationScore,
      trafficScore,
      eventScore,
      reportScore,
      historyScore
    }
  };
}

export function computeOverallUrbanRisk(environment = {}, activeHazards = []) {
  const { rainfall = 12, traffic = 35, eventAttendance = 0 } = environment;
  const hasBlocked = activeHazards.some(h => h.blocked);
  const criticalCount = activeHazards.filter(h => h.severity >= 85).length;

  let baseRisk = computeSegmentRisk({
    rainfallMm: rainfall,
    elevationVulnerability: 50,
    trafficPercent: traffic,
    eventCrowdDensity: eventAttendance > 15000 ? 80 : eventAttendance > 5000 ? 50 : 20,
    reportSeverity: activeHazards.length * 15,
    historicalRisk: 40
  });

  if (hasBlocked || criticalCount >= 2) {
    baseRisk.score = Math.max(baseRisk.score, 88);
    baseRisk.status = classifyRoadStatus(baseRisk.score, false);
  }

  return {
    score: baseRisk.score,
    level: baseRisk.status,
    overallScore: baseRisk.score,
    overallStatus: baseRisk.status,
    activeHazardsCount: activeHazards.length,
    blockedRoadsCount: activeHazards.filter(h => h.blocked).length,
    rainfallMm: rainfall,
    trafficPercent: traffic
  };
}
