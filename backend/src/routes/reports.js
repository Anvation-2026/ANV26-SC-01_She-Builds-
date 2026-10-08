import express from "express";
import { db } from "../database/spatialStore.js";
import { CommunityReport, Hazard } from "../database/models.js";

const router = express.Router();

// GET /api/reports
router.get("/", (req, res) => {
  res.json({
    success: true,
    reports: db.reports
  });
});

// POST /api/reports
router.post("/", (req, res) => {
  const {
    type,
    description,
    latitude,
    longitude,
    userId = "rider-app",
    gpsAccuracy = 8,
    photoEvidence = false
  } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: "Type and description are required" });
  }

  const lat = latitude !== undefined ? parseFloat(latitude) : 12.9560;
  const lng = longitude !== undefined ? parseFloat(longitude) : 77.6010;

  // Multi-factor trust score computation:
  // Base = 50
  // + 15 if GPS accuracy <= 10m
  // + 15 if photo/evidence attached
  // + 10 if detailed description (> 15 chars)
  // + 10 if nearby reports corroborate within 500m
  let trustScore = 50;
  if (gpsAccuracy <= 10) trustScore += 15;
  if (photoEvidence) trustScore += 15;
  if (description.length > 15) trustScore += 10;

  const nearby = db.findNearbyHazards(lat, lng, 600);
  if (nearby.length > 0) trustScore += 10;
  trustScore = Math.min(100, Math.max(0, trustScore));

  const newReport = new CommunityReport({
    id: `REP-${Date.now().toString().slice(-4)}`,
    userId,
    type,
    latitude: lat,
    longitude: lng,
    description,
    severity: type === "ROAD_BLOCKED" || type === "EMERGENCY" ? 95 : 80,
    trustScore,
    gpsAccuracy,
    photoEvidence
  });

  db.reports.unshift(newReport);

  // If high confidence report, activate or register new hazard
  if (type === "FLOODING" || type === "ROAD_BLOCKED" || type === "WATERLOGGING") {
    const hazard = new Hazard({
      id: `HZ-${newReport.id}`,
      name: `Citizen Report: ${type.replace("_", " ")}`,
      type,
      severity: newReport.severity,
      confidence: trustScore,
      blocked: type === "ROAD_BLOCKED",
      roadStatus: type === "ROAD_BLOCKED" ? "BLOCKED" : "HAZARDOUS",
      latitude: lat,
      longitude: lng,
      radiusMeters: 450,
      active: true,
      description
    });
    db.hazards.push(hazard);
  }

  res.status(201).json({
    success: true,
    message: "Report logged with verified trust score",
    report: newReport
  });
});

export default router;
