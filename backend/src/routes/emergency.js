import { randomUUID } from "node:crypto";
import express from "express";
import { pool } from "../database/postgres.js";
import { requireAuth } from "../auth/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

function mapAlert(row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    createdBy: row.created_by,
    riderName: row.rider_name,
    type: row.type,
    message: row.message,
    location: { lat: Number(row.lat), lng: Number(row.lng) },
    radiusMeters: row.radius_m,
    distanceMeters: row.distance_m == null ? null : Math.round(Number(row.distance_m)),
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedByName: row.acknowledged_by_name,
    acknowledgedAt: row.acknowledged_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at
  };
}

async function getAlert(id) {
  const { rows } = await pool.query(
    `SELECT e.*, r.name AS rider_name, a.name AS acknowledged_by_name,
      ST_Y(e.position::geometry) AS lat, ST_X(e.position::geometry) AS lng
     FROM emergency_alerts e JOIN riders r ON r.id=e.created_by
     LEFT JOIN riders a ON a.id=e.acknowledged_by WHERE e.id=$1`, [id]
  );
  return rows[0] ? mapAlert(rows[0]) : null;
}

router.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const requestedRadius = Number(req.query.radiusMeters);
  const radius = Number.isFinite(requestedRadius) ? Math.min(50_000, Math.max(500, requestedRadius)) : 10_000;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, error: "A valid location is required." });
  }
  try {
    await pool.query(
      `INSERT INTO emergency_alert_recipients(alert_id,rider_id,distance_m)
       SELECT e.id,$4,ST_Distance(e.position, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography)
       FROM emergency_alerts e
       WHERE e.status <> 'RESOLVED' AND e.created_at > NOW() - INTERVAL '24 hours'
         AND ST_DWithin(e.position, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, LEAST(e.radius_m,$3))
       ON CONFLICT DO NOTHING`, [lat, lng, radius, req.user.sub]
    );
    const { rows } = await pool.query(
      `SELECT e.*, r.name AS rider_name, a.name AS acknowledged_by_name,
        ST_Y(e.position::geometry) AS lat, ST_X(e.position::geometry) AS lng,
        ST_Distance(e.position, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS distance_m
       FROM emergency_alerts e JOIN riders r ON r.id=e.created_by
       LEFT JOIN riders a ON a.id=e.acknowledged_by
       WHERE e.status <> 'RESOLVED' AND e.created_at > NOW() - INTERVAL '24 hours'
         AND EXISTS (SELECT 1 FROM emergency_alert_recipients er WHERE er.alert_id=e.id AND er.rider_id=$3)
       ORDER BY e.created_at DESC LIMIT 50`, [lat, lng, req.user.sub]
    );
    res.json({ success: true, alerts: rows.map(mapAlert) });
  } catch (error) {
    console.error("Nearby emergency lookup failed:", error.message);
    res.status(500).json({ success: false, error: "Could not load nearby emergency alerts." });
  }
});

router.post("/", async (req, res) => {
  const { lat, lng } = req.body.location || req.body;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const rideId = req.body.rideId || null;
  const requestedRadius = Number(req.body.radiusMeters);
  const radius = Number.isFinite(requestedRadius) ? Math.min(50_000, Math.max(500, requestedRadius)) : 10_000;
  const message = String(req.body.message || "Rider needs emergency assistance.").trim().slice(0, 240);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ success: false, error: "A valid GPS location is required to send SOS." });
  }
  try {
    if (rideId) {
      const { rowCount } = await pool.query("SELECT 1 FROM ride_members WHERE ride_id=$1 AND rider_id=$2", [rideId, req.user.sub]);
      if (!rowCount) return res.status(403).json({ success: false, error: "Join the ride before sending its SOS." });
    }
    const id = randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO emergency_alerts(id,ride_id,created_by,message,position,radius_m)
         VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($6,$5),4326)::geography,$7)`,
        [id, rideId, req.user.sub, message || "Rider needs emergency assistance.", latitude, longitude, radius]
      );
      await client.query(
        `INSERT INTO emergency_alert_recipients(alert_id,rider_id,distance_m)
         SELECT $1, candidates.rider_id, candidates.distance_m FROM (
           SELECT $2::uuid AS rider_id, 0::float AS distance_m
           UNION
           SELECT l.rider_id, ST_Distance(l.position, ST_SetSRID(ST_MakePoint($4,$3),4326)::geography)
           FROM rider_locations l JOIN ride_members m ON m.ride_id=l.ride_id AND m.rider_id=l.rider_id
           WHERE l.updated_at > NOW() - INTERVAL '2 minutes'
             AND ST_DWithin(l.position, ST_SetSRID(ST_MakePoint($4,$3),4326)::geography, $5)
           UNION
           SELECT m.rider_id, NULL::float FROM ride_members m WHERE $6::uuid IS NOT NULL AND m.ride_id=$6
         ) candidates ON CONFLICT DO NOTHING`,
        [id, req.user.sub, latitude, longitude, radius, rideId]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const alert = await getAlert(id);
    const { rows: recipients } = await pool.query("SELECT rider_id FROM emergency_alert_recipients WHERE alert_id=$1", [id]);
    const io = req.app.get("io");
    for (const recipient of recipients) io?.to(`user:${recipient.rider_id}`).emit("emergency:alert", { alert });
    if (rideId) io?.to(`ride:${rideId}`).emit("emergency:alert", { alert });
    res.status(201).json({ success: true, alert, notifiedRiders: recipients.length - 1 });
  } catch (error) {
    console.error("SOS creation failed:", error.message);
    res.status(500).json({ success: false, error: "Could not send the SOS alert." });
  }
});

router.post("/:id/acknowledge", async (req, res) => updateStatus(req, res, "ACKNOWLEDGED"));
router.post("/:id/resolve", async (req, res) => updateStatus(req, res, "RESOLVED"));

async function updateStatus(req, res, status) {
  try {
    const alertResult = await pool.query("SELECT * FROM emergency_alerts WHERE id=$1", [req.params.id]);
    const current = alertResult.rows[0];
    if (!current) return res.status(404).json({ success: false, error: "Emergency alert not found." });
    const { rowCount: isRecipient } = await pool.query("SELECT 1 FROM emergency_alert_recipients WHERE alert_id=$1 AND rider_id=$2", [current.id, req.user.sub]);
    if (!isRecipient) return res.status(403).json({ success: false, error: "This alert was not sent to your account." });
    if (status === "RESOLVED" && current.created_by !== req.user.sub && current.acknowledged_by !== req.user.sub) {
      return res.status(403).json({ success: false, error: "Only the rider who raised or acknowledged this SOS can resolve it." });
    }
    const { rowCount } = await pool.query(
      status === "ACKNOWLEDGED"
        ? "UPDATE emergency_alerts SET status='ACKNOWLEDGED',acknowledged_by=$2,acknowledged_at=NOW() WHERE id=$1 AND status='ACTIVE'"
        : "UPDATE emergency_alerts SET status='RESOLVED',resolved_by=$2,resolved_at=NOW() WHERE id=$1 AND status <> 'RESOLVED'",
      [current.id, req.user.sub]
    );
    if (!rowCount) return res.status(409).json({ success: false, error: "This alert has already changed status." });
    const alert = await getAlert(current.id);
    const { rows: recipients } = await pool.query("SELECT rider_id FROM emergency_alert_recipients WHERE alert_id=$1", [current.id]);
    const io = req.app.get("io");
    for (const recipient of recipients) io?.to(`user:${recipient.rider_id}`).emit("emergency:update", { alert });
    if (current.ride_id) io?.to(`ride:${current.ride_id}`).emit("emergency:update", { alert });
    res.json({ success: true, alert });
  } catch (error) {
    console.error("Emergency status update failed:", error.message);
    res.status(500).json({ success: false, error: "Could not update the emergency alert." });
  }
}

export default router;
