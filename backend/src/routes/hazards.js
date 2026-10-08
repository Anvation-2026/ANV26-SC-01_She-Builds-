import express from "express";
import { db } from "../database/spatialStore.js";
import { computeOverallUrbanRisk } from "../disaster/riskEngine.js";
import { simulationEngine } from "../simulation/simulationEngine.js";

const router = express.Router();

// GET /api/hazards
router.get("/hazards", (req, res) => {
  res.json({
    success: true,
    hazards: db.hazards,
    activeHazards: db.hazards.filter(h => h.active)
  });
});

// GET /api/risk
router.get("/risk", (req, res) => {
  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance
  }, active);

  res.json({
    success: true,
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    score: risk.overallScore,
    level: risk.overallStatus,
    affectedRoadsCount: risk.activeHazardsCount,
    blockedRoadsCount: risk.blockedRoadsCount
  });
});

// POST /api/hazards/:id/toggle
router.post("/hazards/:id/toggle", (req, res) => {
  const hazard = db.hazards.find(h => h.id === req.params.id);
  if (!hazard) return res.status(404).json({ error: "Hazard not found" });

  hazard.active = !hazard.active;
  res.json({ success: true, hazard });
});

export default router;
