import { randomInt, randomUUID } from "node:crypto";
import express from "express";
import { pool } from "../database/postgres.js";
import { db } from "../database/spatialStore.js";
import { requireAuth } from "../auth/requireAuth.js";
import { rideService } from "../rides/rideService.js";
import { calculateDisasterAwareRoute } from "../routing/routingService.js";
import { simulationEngine } from "../simulation/simulationEngine.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const { name, startLocation, destination, waypoints = [] } = req.body;
  if (!name?.trim() || !startLocation || !destination) return res.status(400).json({ success: false, error: "Ride name, start, and destination are required." });
  try {
    const routeData = await calculateDisasterAwareRoute({ origin: startLocation, destination, waypoints });
    if (routeData.primaryRoute?.geometry?.coordinates) {
      simulationEngine.setRouteCoordinates(routeData.primaryRoute.geometry.coordinates);
    }
    const ride = {
      id: randomUUID(),
      code: String(randomInt(100000, 1000000)),
      name: name.trim(),
      leaderId: req.user.sub,
      startLocation,
      destination,
      plannedRoute: routeData.primaryRoute || null,
      status: "ACTIVE"
    };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO rides(id,code,name,leader_id,start_location,destination,planned_route) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [ride.id, ride.code, ride.name, ride.leaderId, startLocation, destination, ride.plannedRoute]
      );
      await client.query("INSERT INTO ride_members(ride_id,rider_id,role) VALUES($1,$2,'LEADER')", [ride.id, req.user.sub]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
    db.users.set(req.user.sub, { id: req.user.sub, name: req.user.name, email: req.user.email });
    const cachedRide = rideService.createRide({ ...ride, leaderId: req.user.sub, plannedRoute: ride.plannedRoute });
    const members = rideService.getRide(cachedRide.id)?.members || [];
    res.status(201).json({ success: true, ride, members, routeData });
  } catch (error) {
    console.error("Create ride error:", error);
    res.status(500).json({ success: false, error: "Could not create ride." });
  }
});

router.post("/join", async (req, res) => {
  const code = String(req.body.code || "").trim();
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: "Enter a valid six-digit ride code." });
  try {
    const { rows } = await pool.query("SELECT * FROM rides WHERE code=$1 AND status='ACTIVE'", [code]);
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, error: "Ride not found." });
    await pool.query("INSERT INTO ride_members(ride_id,rider_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [row.id, req.user.sub]);
    const ride = { id: row.id, code: row.code.trim(), name: row.name, leaderId: row.leader_id, startLocation: row.start_location, destination: row.destination, plannedRoute: row.planned_route, status: row.status };
    const { rows: memberRows } = await pool.query(
      "SELECT r.id AS \"userId\",r.name,m.role,m.joined_at AS \"joinedAt\",l.updated_at AS \"lastSeenAt\", ST_Y(l.position::geometry) AS lat, ST_X(l.position::geometry) AS lng FROM ride_members m JOIN riders r ON r.id=m.rider_id LEFT JOIN rider_locations l ON l.ride_id=m.ride_id AND l.rider_id=m.rider_id AND l.updated_at > NOW() - INTERVAL '2 minutes' WHERE m.ride_id=$1 ORDER BY m.joined_at",
      [row.id]
    );
    const members = memberRows.map((member) => ({ ...member, lastLocation: member.lat == null ? null : { lat: Number(member.lat), lng: Number(member.lng) }, status: member.lastSeenAt ? "ACTIVE" : "JOINED" }));
    res.json({ success: true, ride, members });
  } catch (error) {
    console.error("Join ride error:", error);
    res.status(500).json({ success: false, error: "Could not join ride." });
  }
});

router.get("/mine", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT r.* FROM rides r JOIN ride_members m ON m.ride_id=r.id WHERE m.rider_id=$1 AND r.status='ACTIVE' ORDER BY m.joined_at DESC LIMIT 1",
      [req.user.sub]
    );
    if (!rows[0]) return res.json({ success: true, ride: null, members: [] });
    const row = rows[0];
    const { rows: memberRows } = await pool.query("SELECT r.id AS \"userId\",r.name,m.role,m.joined_at AS \"joinedAt\",l.updated_at AS \"lastSeenAt\",ST_Y(l.position::geometry) AS lat,ST_X(l.position::geometry) AS lng FROM ride_members m JOIN riders r ON r.id=m.rider_id LEFT JOIN rider_locations l ON l.ride_id=m.ride_id AND l.rider_id=m.rider_id AND l.updated_at > NOW() - INTERVAL '2 minutes' WHERE m.ride_id=$1", [row.id]);
    const members = memberRows.map((member) => ({ ...member, lastLocation: member.lat == null ? null : { lat: Number(member.lat), lng: Number(member.lng) }, status: member.lastSeenAt ? "ACTIVE" : "JOINED" }));
    res.json({ success: true, ride: { id: row.id, code: row.code.trim(), name: row.name, leaderId: row.leader_id, startLocation: row.start_location, destination: row.destination, plannedRoute: row.planned_route, status: row.status }, members });
  } catch (error) { console.error("Get rider ride error:", error); res.status(500).json({ success: false, error: "Could not load your active ride." }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT r.* FROM rides r JOIN ride_members m ON m.ride_id=r.id WHERE r.id=$1 AND m.rider_id=$2",
      [req.params.id, req.user.sub]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: "Ride not found." });
    const row = rows[0];
    const { rows: memberRows } = await pool.query("SELECT r.id AS \"userId\",r.name,m.role,m.joined_at AS \"joinedAt\",l.updated_at AS \"lastSeenAt\",ST_Y(l.position::geometry) AS lat,ST_X(l.position::geometry) AS lng FROM ride_members m JOIN riders r ON r.id=m.rider_id LEFT JOIN rider_locations l ON l.ride_id=m.ride_id AND l.rider_id=m.rider_id AND l.updated_at > NOW() - INTERVAL '2 minutes' WHERE m.ride_id=$1", [row.id]);
    const members = memberRows.map((member) => ({ ...member, lastLocation: member.lat == null ? null : { lat: Number(member.lat), lng: Number(member.lng) }, status: member.lastSeenAt ? "ACTIVE" : "JOINED" }));
    res.json({ success: true, ride: { id: row.id, code: row.code.trim(), name: row.name, leaderId: row.leader_id, startLocation: row.start_location, destination: row.destination, plannedRoute: row.planned_route, status: row.status }, members });
  } catch (error) {
    console.error("Get ride error:", error);
    res.status(500).json({ success: false, error: "Could not load ride." });
  }
});

router.use("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await pool.query("SELECT 1 FROM ride_members WHERE ride_id=$1 AND rider_id=$2", [req.params.id, req.user.sub]);
    if (!rowCount) return res.status(403).json({ success: false, error: "You are not a member of this ride." });
    next();
  } catch (error) { next(error); }
});

router.post("/:id/leave", async (req, res) => {
  const rideId = req.params.id;
  try {
    const { rows } = await pool.query("SELECT leader_id FROM rides WHERE id=$1 AND status='ACTIVE'", [rideId]);
    if (!rows[0]) return res.status(404).json({ success: false, error: "This ride is no longer active." });
    const isLeader = rows[0].leader_id === req.user.sub;
    if (isLeader) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rowCount } = await client.query("UPDATE rides SET status='COMPLETED' WHERE id=$1 AND status='ACTIVE'", [rideId]);
        if (!rowCount) {
          await client.query("ROLLBACK");
          return res.status(409).json({ success: false, error: "The ride has already ended." });
        }
        await client.query("DELETE FROM rider_locations WHERE ride_id=$1", [rideId]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
      const ride = db.getRideById(rideId);
      if (ride) ride.status = "COMPLETED";
      for (const member of db.getRideMembers(rideId)) {
        member.lastLocation = null;
        member.lastSeenAt = null;
        member.status = "JOINED";
      }
      db.locations.delete(rideId);
      req.app.get("io")?.to(`ride:${rideId}`).emit("ride:ended", { rideId, endedBy: req.user.sub, endedByName: req.user.name, timestamp: Date.now() });
      return res.json({ success: true, ended: true });
    }

    await pool.query("DELETE FROM ride_members WHERE ride_id=$1 AND rider_id=$2", [rideId, req.user.sub]);
    db.members.get(rideId)?.delete(req.user.sub);
    db.locations.get(rideId)?.delete(req.user.sub);
    req.app.get("io")?.to(`ride:${rideId}`).emit("rider:left", { rideId, userId: req.user.sub, name: req.user.name, timestamp: Date.now() });
    res.json({ success: true, ended: false });
  } catch (error) {
    console.error("Ride leave failed:", error.message);
    res.status(500).json({ success: false, error: "Could not leave this ride." });
  }
});

router.post("/:id/regroup", (req, res) => {
  const result = rideService.requestRegroup(req.params.id);
  if (!result?.success) return res.status(400).json({ success: false, error: "Unable to calculate regroup point yet." });
  res.json({ success: true, regroupPoint: result.regroupPoint });
});
router.post("/:id/reroute", (req, res) => {
  const updatedRide = rideService.applyReroute(req.params.id, req.body.rerouteOption);
  if (!updatedRide) return res.status(404).json({ success: false, error: "Ride not available in this server session." });
  res.json({ success: true, ride: updatedRide });
});
router.post("/:id/emergency", (req, res) => {
  const updatedRide = rideService.toggleEmergencyCorridor(req.params.id, req.body.status);
  if (!updatedRide) return res.status(404).json({ success: false, error: "Ride not available in this server session." });
  res.json({ success: true, emergencyCorridorActive: updatedRide.emergencyCorridorActive });
});

export default router;
