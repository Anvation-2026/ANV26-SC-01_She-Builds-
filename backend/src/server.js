import "./config/loadEnv.js";
import express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import path from "path";
import { initializeWebSockets } from "./websocket/socketHandler.js";
import { initializeDatabase } from "./database/postgres.js";
import { startTomTomTrafficFeed, getTomTomTrafficStatus, pollTomTomTraffic } from "./feeds/tomtomTraffic.js";

// Auto-load .env if present
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val.trim();
      }
    });
  }
} catch (e) {
  // ignore
}

// Routes
import routesRouter from "./routes/routes.js";
import ridesRouter from "./routes/rides.js";
import hazardsRouter from "./routes/hazards.js";
import reportsRouter from "./routes/reports.js";
import eventsRouter from "./routes/events.js";
import simulationRouter from "./routes/simulation.js";
import authRouter from "./routes/auth.js";
import emergencyRouter from "./routes/emergency.js";
import { startOpenMeteoWeatherFeed, getWeatherFeedStatus, pollOpenMeteoWeather } from "./feeds/openMeteoWeather.js";
import { startTicketFairyEventsFeed, getTicketFairyFeedStatus, pollTicketFairyEvents } from "./feeds/ticketfairyEvents.js";

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT, 10) || 5000;

// Catch unexpected exceptions gracefully to prevent crash
process.on("uncaughtException", (err) => {
  console.error("[ResilientUrban Backend] Uncaught Exception:", err.message, err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[ResilientUrban Backend] Unhandled Rejection:", reason);
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use("/api/auth", authRouter);

// Initialize WebSockets
const io = initializeWebSockets(server);
app.set("io", io);
const lastLocationFeedRefresh = { traffic: 0, weather: 0, events: 0 };
const refreshLocationFeeds = () => {
  const now = Date.now();
  if (now - lastLocationFeedRefresh.traffic >= 60_000) {
    lastLocationFeedRefresh.traffic = now;
    void pollTomTomTraffic(io);
  }
  if (now - lastLocationFeedRefresh.weather >= 5 * 60_000) {
    lastLocationFeedRefresh.weather = now;
    void pollOpenMeteoWeather(io);
  }
  if (now - lastLocationFeedRefresh.events >= 15 * 60_000) {
    lastLocationFeedRefresh.events = now;
    void pollTicketFairyEvents(io);
  }
};
app.set("refreshLocationFeeds", refreshLocationFeeds);
io.refreshLocationFeeds = refreshLocationFeeds;

// Root Health & System Diagnosis endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "ResilientUrban Platform Backend",
    healthEndpoint: "/api/health",
    endpoints: [
      "/api/routes",
      "/api/rides",
      "/api/hazards",
      "/api/risk",
      "/api/events",
      "/api/reports",
      "/api/emergency",
      "/api/simulation"
    ],
    timestamp: new Date().toISOString()
  });
});

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ResilientUrban Platform",
    capabilities: [
      "disaster_intelligence",
      "group_rider_coordination",
      "real_time_websockets",
      "opt_in_live_location_sharing",
      "persistent_sos_alerts",
      "location_based_weather_and_event_feeds",
      "osrm_routing",
      "spatial_proximity_and_deviation"
    ],
    feeds: {
      tomtomTraffic: getTomTomTrafficStatus(),
      weather: getWeatherFeedStatus(),
      publicEvents: getTicketFairyFeedStatus(),
      police: { enabled: false, status: "no_public_feed", message: "No official police incident feed is configured for this deployment." }
    },
    timestamp: new Date().toISOString()
  });
});

// Backward-compatibility /api/roads endpoint
app.get("/api/roads", (req, res) => {
  res.json({
    success: true,
    message: "Using OpenStreetMap & OSRM dynamic geometries",
    roads: []
  });
});

// Mount Modular Endpoints
app.use("/api", routesRouter);
app.use("/api/rides", ridesRouter);
app.use("/api", hazardsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/events", eventsRouter);
app.use("/api/simulation", simulationRouter);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("[ResilientUrban API Error]:", err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

// Start Server with EADDRINUSE Protection
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[ResilientUrban Error] Port ${PORT} is already in use.`);
    console.error(`Another instance of the backend is already running on port ${PORT}.\n`);
  } else {
    console.error("[ResilientUrban Server Error]:", err);
  }
});

await initializeDatabase();
startTomTomTrafficFeed(io);
startOpenMeteoWeatherFeed(io);
startTicketFairyEventsFeed(io);
server.listen(PORT, () => console.log(`[ResilientUrban] PostgreSQL, API & WebSockets ready on http://localhost:${PORT}`));
