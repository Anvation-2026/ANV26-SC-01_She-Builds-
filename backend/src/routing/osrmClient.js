/**
 * Centralized OSRM Routing Client
 */

const OSRM_PUBLIC_URL = process.env.OSRM_ROUTING_URL || "https://router.project-osrm.org/route/v1/driving";

export async function queryOSRMRoute(waypoints, { alternatives = true, steps = true } = {}) {
  // waypoints: Array of [lng, lat]
  if (!waypoints || waypoints.length < 2) {
    throw new Error("At least 2 waypoints required for routing");
  }

  const coordString = waypoints.map(w => `${w[0]},${w[1]}`).join(";");
  const url = `${OSRM_PUBLIC_URL}/${coordString}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=${steps}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM route calculation error: ${data.code || "No routes"}`);
    }
    return data.routes;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[OSRM Client] Fallback triggered:", err.message);
    return null;
  }
}
