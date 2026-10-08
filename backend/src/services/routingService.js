/**
 * Routing Service for ResilientUrban
 * Integrates with OSRM public service and resilient waypoint generation
 * Supports all Bengaluru transit corridors: Koramangala, Indiranagar, Electronic City, Whitefield
 */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// Corridor-specific resilient detour waypoints
const CORRIDOR_DETOUR_WAYPOINTS = {
  indiranagar: [77.6350, 12.9620],     // Domlur / Old Airport Road elevated bypass
  koramangala: [77.6360, 12.9610],     // Inner Ring Road Elevated Corridor
  electronic_city: [77.6020, 12.8900], // Bannerghatta Road / NICE link bypass
  whitefield: [77.7050, 12.9950]       // Old Madras Road / KR Puram Bypass
};

// Identify transit corridor from destination coordinate
export function identifyCorridor(destination) {
  const [destLng, destLat] = destination;
  if (destLat < 12.90) return "electronic_city";
  if (destLng > 77.70) return "whitefield";
  if (destLng > 77.63 && destLat > 12.965) return "indiranagar";
  return "koramangala";
}

// Fallback geometries if public OSRM is offline or slow
const CORRIDOR_FALLBACKS = {
  koramangala: {
    normal: [
      [77.5946, 12.9716],
      [77.5975, 12.9610],
      [77.6010, 12.9515],
      [77.6080, 12.9430],
      [77.6245, 12.9352]
    ],
    safe: [
      [77.5946, 12.9716],
      [77.6180, 12.9750],
      [77.6320, 12.9620],
      [77.6360, 12.9510],
      [77.6245, 12.9352]
    ]
  },
  indiranagar: {
    normal: [
      [77.5946, 12.9716],
      [77.6080, 12.9720],
      [77.6180, 12.9730], // Trinity Circle (HZ-006)
      [77.6280, 12.9770],
      [77.6385, 12.9775], // 100 Ft Rd Junction (HZ-005)
      [77.6412, 12.9784]
    ],
    safe: [
      [77.5946, 12.9716],
      [77.6100, 12.9650],
      [77.6250, 12.9610],
      [77.6350, 12.9620], // Detour via Domlur / Old Airport Rd elevated
      [77.6410, 12.9700],
      [77.6412, 12.9784]
    ]
  },
  electronic_city: {
    normal: [
      [77.5946, 12.9716],
      [77.6050, 12.9450],
      [77.6235, 12.9175], // Silk Board (HZ-008)
      [77.6350, 12.8950],
      [77.6680, 12.8452]
    ],
    safe: [
      [77.5946, 12.9716],
      [77.5850, 12.9300],
      [77.6020, 12.8900], // Bannerghatta / NICE Link detour
      [77.6350, 12.8600],
      [77.6680, 12.8452]
    ]
  },
  whitefield: {
    normal: [
      [77.5946, 12.9716],
      [77.6400, 12.9600],
      [77.7010, 12.9560], // Marathahalli (HZ-010)
      [77.7300, 12.9700],
      [77.7499, 12.9863]
    ],
    safe: [
      [77.5946, 12.9716],
      [77.6300, 12.9900],
      [77.7050, 12.9950], // Old Madras Rd / KR Puram Bypass detour
      [77.7450, 12.9920],
      [77.7499, 12.9863]
    ]
  }
};

// Check if a line coordinate is within proximity of an active hazard
function isNearHazard(coord, hazard) {
  const [lng, lat] = coord;
  const dLat = (lat - hazard.latitude) * 111000;
  const dLng = (lng - hazard.longitude) * 111000 * Math.cos((lat * Math.PI) / 180);
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  return dist <= (hazard.radiusMeters || 650);
}

function routeIntersectsHazards(coordinates, activeHazards, corridor) {
  if (!activeHazards || activeHazards.length === 0) return [];
  const hitHazards = [];

  for (const hazard of activeHazards) {
    const hitsCoord = coordinates.some(coord => isNearHazard(coord, hazard));
    const matchesCorridor = hazard.corridor === corridor;
    if (hitsCoord || matchesCorridor) {
      if (!hitHazards.find(h => h.id === hazard.id)) {
        hitHazards.push(hazard);
      }
    }
  }
  return hitHazards;
}

export async function fetchOSRMRoute(waypoints) {
  const coordString = waypoints.map(w => `${w[0]},${w[1]}`).join(";");
  const url = `${OSRM_BASE}/${coordString}?overview=full&geometries=geojson&alternatives=true&steps=false`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`OSRM responded with ${res.status}`);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found from OSRM");
    }
    return data.routes;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("OSRM fetch warning:", err.message);
    return null;
  }
}

export async function getCalculatedRoutes({
  start = [77.5946, 12.9716],
  destination = [77.6245, 12.9352],
  activeHazards = [],
  avoidHazards = false
}) {
  const corridor = identifyCorridor(destination);
  const corridorFallback = CORRIDOR_FALLBACKS[corridor] || CORRIDOR_FALLBACKS.koramangala;
  const detourWaypoint = CORRIDOR_DETOUR_WAYPOINTS[corridor] || CORRIDOR_DETOUR_WAYPOINTS.koramangala;

  let normalRouteFeature = null;
  let safeRouteFeature = null;

  // 1. Fetch normal direct route
  const directRoutes = await fetchOSRMRoute([start, destination]);

  if (directRoutes && directRoutes[0]) {
    const bestNormal = directRoutes[0];
    normalRouteFeature = {
      type: "Feature",
      properties: {
        name: `Primary Corridor (${corridor.toUpperCase()})`,
        distance: Math.round(bestNormal.distance),
        duration: Math.round(bestNormal.duration),
        isPrimary: true
      },
      geometry: bestNormal.geometry
    };
  } else {
    normalRouteFeature = {
      type: "Feature",
      properties: {
        name: `Primary Corridor (${corridor.toUpperCase()})`,
        distance: 7200,
        duration: 1300,
        isPrimary: true
      },
      geometry: {
        type: "LineString",
        coordinates: corridorFallback.normal
      }
    };
  }

  // 2. Check if normal route intersects active hazards
  const normalCoords = normalRouteFeature.geometry.coordinates;
  const intersected = routeIntersectsHazards(normalCoords, activeHazards, corridor);
  const isHazardDetected = intersected.length > 0;
  const avoidedHazards = intersected;

  // 3. Compute Safe Route
  if (!avoidHazards || !isHazardDetected) {
    safeRouteFeature = {
      ...normalRouteFeature,
      properties: {
        ...normalRouteFeature.properties,
        status: "SAFE",
        label: "Optimal Road Conditions"
      }
    };
  } else {
    // Attempt detour route via corridor-specific bypass waypoint
    const detourRoutes = await fetchOSRMRoute([start, detourWaypoint, destination]);

    if (detourRoutes && detourRoutes[0]) {
      const bestSafe = detourRoutes[0];
      safeRouteFeature = {
        type: "Feature",
        properties: {
          name: `Resilient Detour (${corridor.toUpperCase()} Bypass)`,
          distance: Math.round(bestSafe.distance),
          duration: Math.round(bestSafe.duration),
          status: "REROUTED",
          label: "Hazard Avoidance Route"
        },
        geometry: bestSafe.geometry
      };
    } else {
      safeRouteFeature = {
        type: "Feature",
        properties: {
          name: `Resilient Detour (${corridor.toUpperCase()} Bypass)`,
          distance: Math.round((normalRouteFeature.properties.distance || 7200) * 1.25),
          duration: Math.round((normalRouteFeature.properties.duration || 1300) * 1.15),
          status: "REROUTED",
          label: "Hazard Avoidance Route"
        },
        geometry: {
          type: "LineString",
          coordinates: corridorFallback.safe
        }
      };
    }
  }

  // Calculate ETA formatting & Risk avoided %
  const normalEtaMinutes = Math.round((normalRouteFeature.properties.duration || 1200) / 60);
  const safeEtaMinutes = Math.round((safeRouteFeature.properties.duration || 1400) / 60);

  const baseRisk = isHazardDetected ? 88 : 25;
  const safeRisk = isHazardDetected ? 18 : 25;
  const riskAvoided = isHazardDetected ? Math.round(((baseRisk - safeRisk) / baseRisk) * 100) : 0;

  return {
    normalRoute: normalRouteFeature,
    safeRoute: safeRouteFeature,
    isHazardDetected,
    avoidedHazards,
    corridor,
    metrics: {
      normalEtaMinutes,
      safeEtaMinutes,
      riskAvoidedPercentage: riskAvoided,
      normalDistanceKm: ((normalRouteFeature.properties.distance || 7000) / 1000).toFixed(1),
      safeDistanceKm: ((safeRouteFeature.properties.distance || 8500) / 1000).toFixed(1)
    }
  };
}
