import express from "express";
import { rideService } from "../rides/rideService.js";
import { calculateDisasterAwareRoute } from "../routing/routingService.js";

const router = express.Router();

// POST /api/rides - Create a new Group Ride
router.post("/", async (req, res) => {
  try {
    const { name, leaderId = "user-leader", startLocation, destination, waypoints = [] } = req.body;

    if (!name || !startLocation || !destination) {
      return res.status(400).json({ error: "name, startLocation, and destination are required" });
    }

    // Generate real OSRM planned route
    const routeData = await calculateDisasterAwareRoute({
      origin: startLocation,
      destination,
      waypoints
    });

    const plannedRoute = routeData.primaryRoute || null;

    const ride = rideService.createRide({
      name,
      leaderId,
      startLocation,
      destination,
      waypoints,
      plannedRoute
    });

    const members = rideService.getRide(ride.id)?.members || [];

    res.status(201).json({
      success: true,
      ride,
      members,
      routeData
    });
  } catch (err) {
    console.error("Create ride error:", err);
    res.status(500).json({ success: false, error: "Failed to create ride" });
  }
});

// POST /api/rides/join - Join ride using 6-digit code
router.post("/join", (req, res) => {
  const { code, user = { id: `user-${Date.now().toString(36)}`, name: "Guest Rider" } } = req.body;

  if (!code) {
    return res.status(400).json({ error: "6-digit ride code is required" });
  }

  const result = rideService.joinRide(code.trim(), user);
  if (!result) {
    return res.status(404).json({ error: "Ride not found or invalid code" });
  }

  res.json({
    success: true,
    ride: result.ride,
    members: result.members
  });
});

// GET /api/rides/:id - Get ride details and active members
router.get("/:id", (req, res) => {
  const result = rideService.getRide(req.params.id);
  if (!result) {
    return res.status(404).json({ error: "Ride not found" });
  }
  res.json({
    success: true,
    ride: result.ride,
    members: result.members
  });
});

// POST /api/rides/:id/regroup - Request regroup point recommendation
router.post("/:id/regroup", (req, res) => {
  const result = rideService.requestRegroup(req.params.id);
  if (!result || !result.success) {
    return res.status(400).json({ success: false, error: "Unable to calculate regroup point" });
  }
  res.json({
    success: true,
    regroupPoint: result.regroupPoint
  });
});

// POST /api/rides/:id/reroute - Apply dynamic reroute to group
router.post("/:id/reroute", (req, res) => {
  const { rerouteOption } = req.body;
  const updatedRide = rideService.applyReroute(req.params.id, rerouteOption);
  if (!updatedRide) {
    return res.status(404).json({ error: "Ride not found" });
  }
  res.json({
    success: true,
    ride: updatedRide
  });
});

// POST /api/rides/:id/emergency - Toggle emergency corridor
router.post("/:id/emergency", (req, res) => {
  const { status } = req.body;
  const updatedRide = rideService.toggleEmergencyCorridor(req.params.id, status);
  if (!updatedRide) {
    return res.status(404).json({ error: "Ride not found" });
  }
  res.json({
    success: true,
    emergencyCorridorActive: updatedRide.emergencyCorridorActive
  });
});

export default router;
