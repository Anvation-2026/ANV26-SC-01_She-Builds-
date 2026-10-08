import express from "express";
import { calculateDisasterAwareRoute } from "../routing/routingService.js";
import { simulationEngine } from "../simulation/simulationEngine.js";

const router = express.Router();

// Centralized Routing endpoint: POST /api/routes
router.post("/routes", async (req, res) => {
  try {
    const { origin, destination, waypoints = [], emergencyCorridor = false, simulatedHazards = [] } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination are required" });
    }

    const routeData = await calculateDisasterAwareRoute({
      origin,
      destination,
      waypoints,
      emergencyCorridor,
      simulatedHazards
    });

    // Update simulation engine route geometry if primary route succeeded
    if (routeData.primaryRoute?.geometry?.coordinates) {
      simulationEngine.setRouteCoordinates(routeData.primaryRoute.geometry.coordinates);
    }

    res.json({
      success: true,
      ...routeData
    });
  } catch (err) {
    console.error("Routing error:", err);
    res.status(500).json({ success: false, error: "Failed to compute route" });
  }
});

// Legacy backward-compatibility alias: POST /api/route
router.post("/route", async (req, res) => {
  try {
    const { start = [77.5946, 12.9716], destination = [77.6245, 12.9352], waypoints = [] } = req.body;
    const origin = Array.isArray(start) ? { lng: start[0], lat: start[1] } : start;
    const dest = Array.isArray(destination) ? { lng: destination[0], lat: destination[1] } : destination;

    const routeData = await calculateDisasterAwareRoute({
      origin,
      destination: dest,
      waypoints
    });

    if (routeData.primaryRoute?.geometry?.coordinates) {
      simulationEngine.setRouteCoordinates(routeData.primaryRoute.geometry.coordinates);
    }

    res.json({
      success: true,
      normalRoute: routeData.primaryRoute,
      safeRoute: routeData.alternatives?.safest?.geometry ? {
        type: "Feature",
        properties: { name: "Safe Detour Route", status: "REROUTED" },
        geometry: routeData.alternatives.safest.geometry
      } : routeData.primaryRoute,
      isHazardDetected: routeData.hasDisasterRisk,
      avoidedHazards: routeData.intersectingHazards || [],
      metrics: {
        normalEtaMinutes: routeData.primaryRoute?.properties?.etaMinutes || 20,
        safeEtaMinutes: routeData.alternatives?.safest?.etaMinutes || 24,
        riskAvoidedPercentage: routeData.hasDisasterRisk ? 80 : 0,
        normalDistanceKm: routeData.primaryRoute?.properties?.distanceKm || "7.2",
        safeDistanceKm: routeData.alternatives?.safest?.distanceKm || "8.8"
      },
      alternatives: routeData.alternatives
    });
  } catch (err) {
    console.error("Route error:", err);
    res.status(500).json({ success: false, error: "Routing error" });
  }
});

export default router;
