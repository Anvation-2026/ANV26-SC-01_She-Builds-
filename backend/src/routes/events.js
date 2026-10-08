import express from "express";
import { db } from "../database/spatialStore.js";

const router = express.Router();

// GET /api/events
router.get("/", (req, res) => {
  res.json({
    success: true,
    events: db.events
  });
});

// POST /api/events/:id/toggle
router.post("/:id/toggle", (req, res) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  event.status = event.status === "ACTIVE" ? "RESOLVED" : "ACTIVE";
  res.json({ success: true, event });
});

export default router;
