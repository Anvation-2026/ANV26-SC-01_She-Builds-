const TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute";

function normalizeTomTomRoute(route) {
  const coordinates = (route.legs || []).flatMap((leg) =>
    (leg.points || []).map((point) => [point.longitude, point.latitude])
  );
  const summary = route.summary || {};
  if (coordinates.length < 2 || !Number.isFinite(summary.lengthInMeters) || !Number.isFinite(summary.travelTimeInSeconds)) return null;

  return {
    distance: summary.lengthInMeters,
    duration: summary.travelTimeInSeconds,
    trafficDelaySeconds: summary.trafficDelayInSeconds || 0,
    geometry: { type: "LineString", coordinates }
  };
}

export async function queryTomTomRoutes(waypoints, { maxAlternatives = 2 } = {}) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey || !Array.isArray(waypoints) || waypoints.length < 2) return null;

  const locations = waypoints.map(([longitude, latitude]) => `${latitude},${longitude}`).join(":");
  const params = new URLSearchParams({
    key: apiKey,
    traffic: "true",
    routeType: "fastest",
    travelMode: "motorcycle",
    routeRepresentation: "polyline",
    maxAlternatives: String(maxAlternatives),
    alternativeType: "anyRoute"
  });

  try {
    const response = await fetch(`${TOMTOM_ROUTING_URL}/${locations}/json?${params}`, {
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`TomTom Routing returned HTTP ${response.status}`);
    const payload = await response.json();
    const routes = (payload.routes || []).map(normalizeTomTomRoute).filter(Boolean);
    if (!routes.length) throw new Error("TomTom Routing returned no usable routes");
    return routes;
  } catch (error) {
    console.warn("[TomTom Routing] Falling back to OSRM:", error.message || "request failed");
    return null;
  }
}
