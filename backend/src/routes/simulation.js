import express from "express";
import { simulationEngine } from "../simulation/simulationEngine.js";
import { computeOverallUrbanRisk } from "../disaster/riskEngine.js";
import { db } from "../database/spatialStore.js";

const router = express.Router();

// GET /api/simulation/state
router.get("/state", (req, res) => {
  const activeHazards = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance
  }, activeHazards);

  res.json({
    success: true,
    isPlaying: simulationEngine.isPlaying,
    speedMultiplier: simulationEngine.speedMultiplier,
    scenario: simulationEngine.activeScenario,
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance,
    risk,
    riders: simulationEngine.riders
  });
});

// POST /api/simulation/play
router.post("/play", (req, res) => {
  simulationEngine.play();
  res.json({ success: true, isPlaying: true });
});

// POST /api/simulation/pause
router.post("/pause", (req, res) => {
  simulationEngine.pause();
  res.json({ success: true, isPlaying: false });
});

// POST /api/simulation/reset
router.post("/reset", (req, res) => {
  simulationEngine.reset();
  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic
  }, active);

  res.json({
    success: true,
    message: "Simulation reset to baseline conditions",
    isPlaying: false,
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    risk,
    score: risk.score,
    level: risk.level
  });
});

// POST /api/simulation/step
router.post("/step", (req, res) => {
  const updatedRiders = simulationEngine.step();
  res.json({ success: true, riders: updatedRiders });
});

// POST /api/simulation/speed
router.post("/speed", (req, res) => {
  const { multiplier = 1 } = req.body;
  simulationEngine.setSpeed(multiplier);
  res.json({ success: true, speedMultiplier: multiplier });
});

// POST /api/simulation/scenario/:id
router.post("/scenario/:id", (req, res) => {
  const scenarioId = parseInt(req.params.id, 10);
  simulationEngine.loadScenario(scenarioId);

  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance
  }, active);

  res.json({
    success: true,
    scenario: scenarioId,
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    risk,
    score: risk.score,
    level: risk.level,
    activeHazards: active
  });
});

// POST /api/simulation/rider/:action
router.post("/rider/:action", (req, res) => {
  const { action } = req.params;

  if (action === "move-off-route") {
    simulationEngine.moveRahulOffRoute();
  } else if (action === "fall-behind") {
    simulationEngine.makeAkashFallBehind();
  } else if (action === "stop") {
    simulationEngine.stopVivek();
  } else {
    return res.status(400).json({ error: "Unknown action" });
  }

  res.json({
    success: true,
    action,
    riders: simulationEngine.riders
  });
});

// --- BACKWARD COMPATIBILITY DEMO ALIASES ---
router.post("/heavy-rain", (req, res) => {
  simulationEngine.loadScenario(5);
  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic
  }, active);

  res.json({
    success: true,
    mode: "HEAVY_RAIN",
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    risk,
    activeHazards: active
  });
});

router.post("/road-closure", (req, res) => {
  simulationEngine.loadScenario(7);
  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance
  }, active);

  res.json({
    success: true,
    mode: "ROAD_CLOSURE",
    traffic: simulationEngine.traffic,
    risk,
    activeHazards: active
  });
});

router.post("/combined", (req, res) => {
  simulationEngine.loadScenario(8);
  const active = db.hazards.filter(h => h.active);
  const risk = computeOverallUrbanRisk({
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    eventAttendance: simulationEngine.eventAttendance
  }, active);

  res.json({
    success: true,
    mode: "COMBINED",
    rainfall: simulationEngine.rainfall,
    traffic: simulationEngine.traffic,
    risk,
    activeHazards: active
  });
});

export default router;
