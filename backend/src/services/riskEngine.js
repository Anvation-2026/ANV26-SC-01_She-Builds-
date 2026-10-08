/**
 * Risk Engine for ResilientUrban
 * Deterministic formula:
 * riskScore = rainfallScore * 0.40 + trafficScore * 0.25 + reportScore * 0.20 + historicalRisk * 0.15
 * If roadBlocked: riskScore = 100
 * 
 * Levels:
 * 0 - 30: LOW
 * 31 - 60: MODERATE
 * 61 - 80: HIGH
 * 81 - 100: CRITICAL
 */

export function calculateRiskLevel(score) {
  const rounded = Math.round(score);
  if (rounded <= 30) return "LOW";
  if (rounded <= 60) return "MODERATE";
  if (rounded <= 80) return "HIGH";
  return "CRITICAL";
}

export function computeRoadRisk({
  rainfallScore = 0,
  trafficScore = 0,
  reportScore = 0,
  historicalRisk = 0,
  roadBlocked = false
}) {
  if (roadBlocked) {
    return {
      score: 100,
      level: "CRITICAL",
      blocked: true
    };
  }

  const rawScore =
    rainfallScore * 0.40 +
    trafficScore * 0.25 +
    reportScore * 0.20 +
    historicalRisk * 0.15;

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const level = calculateRiskLevel(score);

  return {
    score,
    level,
    blocked: score >= 90
  };
}

export function computeOverallRisk(roads, environment) {
  const { rainfall = 12, traffic = 35, reportsCount = 0 } = environment;

  // Normalize inputs to 0-100 scales
  // Rainfall: 0 mm/hr -> 0, 100+ mm/hr -> 100
  const rainfallScore = Math.min(100, Math.round((rainfall / 100) * 100));
  const trafficScore = Math.min(100, Math.max(0, traffic));
  const reportScore = Math.min(100, reportsCount * 20);

  const blockedCount = roads.filter(r => r.blocked).length;
  const criticalCount = roads.filter(r => r.riskLevel === "CRITICAL").length;

  if (blockedCount > 0 || criticalCount >= 2) {
    const calculated = computeRoadRisk({
      rainfallScore,
      trafficScore,
      reportScore,
      historicalRisk: 60,
      roadBlocked: false
    });
    const forcedScore = Math.max(calculated.score, 85);
    return {
      score: forcedScore,
      level: calculateRiskLevel(forcedScore),
      rainfallScore,
      trafficScore,
      affectedRoadsCount: blockedCount + criticalCount
    };
  }

  const calculated = computeRoadRisk({
    rainfallScore,
    trafficScore,
    reportScore,
    historicalRisk: 30,
    roadBlocked: false
  });

  return {
    score: calculated.score,
    level: calculated.level,
    rainfallScore,
    trafficScore,
    affectedRoadsCount: roads.filter(r => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length
  };
}
