/**
 * Realistic Rider & Disaster Simulation Engine
 * Interpolates rider movement along actual OSRM-generated route geometry
 * Supports Scenarios 1 to 8, manual rider perturbations, speed multipliers, and disaster controls
 */


// Standard corridor route geometry coordinates between Cubbon Park and Koramangala
const DEFAULT_ROUTE_GEOMETRY = [
  [77.5946, 12.9716],
  [77.5962, 12.9665],
  [77.5985, 12.9590],
  [77.6010, 12.9525],
  [77.6050, 12.9470],
  [77.6095, 12.9425],
  [77.6160, 12.9380],
  [77.6205, 12.9360],
  [77.6245, 12.9352]
];

export class SimulationEngine {
  constructor() {
    this.isPlaying = false;
    this.speedMultiplier = 1;
    this.activeScenario = 1;
    this.rainfall = 12; // mm/hr
    this.traffic = 35;  // %
    this.eventAttendance = 0;
    this.hazards = [];
    this.events = [];
    this.routeCoordinates = [...DEFAULT_ROUTE_GEOMETRY];
    this.rideId = "ride-demo-01";
    this.timerInterval = null;
    this.stepIndex = 0;

    // Simulated Riders State
    this.riders = [
      {
        userId: "user-leader",
        name: "Vikram (Leader)",
        role: "LEADER",
        avatar: "⭐",
        progress: 0.28,
        speedFactor: 1.0,
        isStopped: false,
        isOffRoute: false,
        offRouteOffset: [0, 0]
      },
      {
        userId: "user-rahul",
        name: "Rahul",
        role: "MEMBER",
        avatar: "🔵",
        progress: 0.25,
        speedFactor: 1.0,
        isStopped: false,
        isOffRoute: false,
        offRouteOffset: [0, 0]
      },
      {
        userId: "user-akash",
        name: "Akash",
        role: "MEMBER",
        avatar: "🟣",
        progress: 0.22,
        speedFactor: 1.0,
        isStopped: false,
        isOffRoute: false,
        offRouteOffset: [0, 0]
      },
      {
        userId: "user-vivek",
        name: "Vivek",
        role: "MEMBER",
        avatar: "🟠",
        progress: 0.19,
        speedFactor: 1.0,
        isStopped: false,
        isOffRoute: false,
        offRouteOffset: [0, 0]
      },
      {
        userId: "user-arjun",
        name: "Arjun (Sweeper)",
        role: "SWEEPER",
        avatar: "🟢",
        progress: 0.16,
        speedFactor: 1.0,
        isStopped: false,
        isOffRoute: false,
        offRouteOffset: [0, 0]
      }
    ];

    this.onTickCallback = null;
  }

  setRouteCoordinates(coords) {
    if (coords && coords.length >= 2) {
      this.routeCoordinates = coords;
    }
  }

  setOnTick(callback) {
    this.onTickCallback = callback;
  }

  /**
   * Interpolates [lng, lat] coordinate along route polyline at normalized progress [0.0, 1.0]
   */
  interpolatePosition(progress) {
    const coords = this.routeCoordinates;
    if (!coords || coords.length === 0) return [77.5946, 12.9716];
    if (progress <= 0) return coords[0];
    if (progress >= 1) return coords[coords.length - 1];

    const totalSegments = coords.length - 1;
    const scaled = progress * totalSegments;
    const index = Math.floor(scaled);
    const frac = scaled - index;

    const p1 = coords[index];
    const p2 = coords[Math.min(index + 1, coords.length - 1)];

    const lng = p1[0] + (p2[0] - p1[0]) * frac;
    const lat = p1[1] + (p2[1] - p1[1]) * frac;

    return [lng, lat];
  }

  /**
   * Single simulation tick advancing riders and broadcasting state
   */
  step() {
    this.stepIndex++;
    const baseIncrement = 0.004 * this.speedMultiplier;

    const updatedLocations = [];

    this.riders.forEach(rider => {
      if (!rider.isStopped && rider.progress < 1) {
        rider.progress = Math.min(1, rider.progress + baseIncrement * rider.speedFactor);
      }

      const [baseLng, baseLat] = this.interpolatePosition(rider.progress);

      // Apply off-route offset if diverged
      let finalLng = baseLng;
      let finalLat = baseLat;

      if (rider.isOffRoute) {
        finalLng += rider.offRouteOffset[0];
        finalLat += rider.offRouteOffset[1];
      }

      const locationData = {
        lat: parseFloat(finalLat.toFixed(6)),
        lng: parseFloat(finalLng.toFixed(6)),
        accuracy: 5,
        speed: rider.isStopped || rider.progress >= 1 ? 0 : Math.round(7.5 * rider.speedFactor * 3.6), // km/h
        heading: 145,
        timestamp: Date.now()
      };

      updatedLocations.push({
        rider: {
          userId: rider.userId,
          name: rider.name,
          role: rider.role,
          avatar: rider.avatar,
          isStopped: rider.isStopped,
          isOffRoute: rider.isOffRoute,
          hasArrived: rider.progress >= 1
        },
        location: locationData,
        analysis: null
      });
    });

    if (this.onTickCallback) {
      this.onTickCallback({
        stepIndex: this.stepIndex,
        riders: updatedLocations,
        scenario: this.activeScenario,
        environmental: {
          rainfall: this.rainfall,
          traffic: this.traffic,
          eventAttendance: this.eventAttendance
        },
        hazards: this.hazards,
        events: this.events
      });
    }

    return updatedLocations;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.step();
    }, 1000);
  }

  pause() {
    this.isPlaying = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
  }

  reset() {
    this.pause();
    this.stepIndex = 0;
    this.activeScenario = 1;
    this.speedMultiplier = 1;
    this.rainfall = 12;
    this.traffic = 35;
    this.eventAttendance = 0;
    this.hazards = [];
    this.events = [];

    // Reset riders
    this.riders.forEach((r, idx) => {
      r.progress = 0.28 - idx * 0.03;
      r.speedFactor = 1.0;
      r.isStopped = false;
      r.isOffRoute = false;
      r.offRouteOffset = [0, 0];
    });

    return this.step();
  }

  // --- MANUAL RIDER PERTURBATIONS ---
  moveRahulOffRoute(emitTick = true) {
    const rahul = this.riders.find(r => r.userId === "user-rahul");
    if (rahul) {
      rahul.isOffRoute = true;
      // Offset by approx 450m East-North
      rahul.offRouteOffset = [0.0042, 0.0035];
    }
    return emitTick ? this.step() : this.riders;
  }

  makeAkashFallBehind(emitTick = true) {
    const akash = this.riders.find(r => r.userId === "user-akash");
    if (akash) {
      akash.speedFactor = 0.25; // Crawling
      akash.progress = Math.max(0, akash.progress - 0.08); // Lag behind by ~1.5km
    }
    return emitTick ? this.step() : this.riders;
  }

  stopVivek(emitTick = true) {
    const vivek = this.riders.find(r => r.userId === "user-vivek");
    if (vivek) {
      vivek.isStopped = !vivek.isStopped;
    }
    return emitTick ? this.step() : this.riders;
  }

  addScenarioHazard(id, name, type, severity, progress, description, radiusMeters = 400) {
    const coords = this.routeCoordinates;
    const routeIndex = Math.round(Math.max(0, Math.min(1, progress)) * (coords.length - 1));
    const [longitude, latitude] = coords[routeIndex] || this.interpolatePosition(progress);
    this.hazards.push({
      id: `SIM-${id}`, source: "Simulation", name, type, severity, confidence: 100,
      latitude, longitude, radiusMeters, active: true, blocked: type === "ROAD_CLOSURE",
      roadStatus: type === "ROAD_CLOSURE" ? "BLOCKED" : "HAZARDOUS", description,
      timestamp: new Date().toISOString()
    });
  }

  addScenarioEvent(id, name, type, progress, expectedAttendance, description, radiusMeters = 700) {
    const coords = this.routeCoordinates;
    const routeIndex = Math.round(Math.max(0, Math.min(1, progress)) * (coords.length - 1));
    const [longitude, latitude] = coords[routeIndex] || this.interpolatePosition(progress);
    this.events.push({
      id: `SIM-${id}`, source: "Simulation", name, type, status: "ACTIVE",
      latitude, longitude, expectedAttendance, radiusMeters, description,
      timestamp: new Date().toISOString()
    });
  }

  // --- PREDEFINED SCENARIOS 1 TO 8 ---
  loadScenario(scenarioNumber) {
    this.activeScenario = scenarioNumber;

    // Reset to the same formation before each scenario.
    this.hazards = [];
    this.events = [];
    this.riders.forEach((r, idx) => {
      r.progress = 0.28 - idx * 0.03;
      r.speedFactor = 1.0;
      r.isStopped = false;
      r.isOffRoute = false;
      r.offRouteOffset = [0, 0];
    });

    switch (scenarioNumber) {
      case 1: // Normal Group Ride
        this.rainfall = 10;
        this.traffic = 30;
        this.eventAttendance = 0;
        break;

      case 2: // Rider Falls Behind
        this.rainfall = 15;
        this.traffic = 40;
        this.makeAkashFallBehind(false);
        break;

      case 3: // Rider Goes Off Route
        this.rainfall = 15;
        this.traffic = 40;
        this.moveRahulOffRoute(false);
        break;

      case 4: // Rider Approaching (starts 2.5km behind)
        this.rainfall = 12;
        this.traffic = 35;
        const rahulAppr = this.riders.find(r => r.userId === "user-rahul");
        if (rahulAppr) {
          rahulAppr.progress = 0.05; // ~2.5km behind leader
          rahulAppr.speedFactor = 2.2; // Catching up fast
        }
        break;

      case 5: // Heavy Rain
        this.rainfall = 78;
        this.traffic = 75;
        this.addScenarioHazard("RAIN", "Heavy rain and surface water", "WATERLOGGING", 72, 0.58, "Simulated heavy rain is reducing visibility and making this section hazardous.", 650);
        break;

      case 6: // Flooded Road
        this.rainfall = 85;
        this.traffic = 80;
        this.addScenarioHazard("CLOSURE", "Simulated flooded road", "ROAD_CLOSURE", 95, 0.52, "This road section is closed in the simulation. Check the safer route option.", 550);
        break;

      case 7: // Large Public Event
        this.rainfall = 15;
        this.traffic = 91;
        this.eventAttendance = 25000;
        this.addScenarioEvent("GATHERING", "Public gathering", "PUBLIC_GATHERING", 0.68, this.eventAttendance, "Simulated public gathering may slow traffic near this section.");
        this.addScenarioHazard("CONGESTION", "Event traffic congestion", "TRAFFIC_CONGESTION", 58, 0.68, "Simulated congestion around a public gathering.", 700);
        break;

      case 8: // MAIN DEMO SCENARIO: Heavy Rain + Event + Off-route + Fallen behind
        this.rainfall = 88;
        this.traffic = 92;
        this.eventAttendance = 30000;
        this.addScenarioHazard("FLOOD", "Flooded road section", "ROAD_CLOSURE", 95, 0.54, "Simulated flooding has closed this road section.", 600);
        this.addScenarioHazard("RAIN", "Heavy rain", "WEATHER_HAZARD", 78, 0.72, "Simulated heavy rain is affecting visibility.", 500);
        this.addScenarioEvent("GATHERING", "Public gathering", "PUBLIC_GATHERING", 0.78, this.eventAttendance, "Simulated crowd congestion near the route.");
        this.moveRahulOffRoute(false);
        this.makeAkashFallBehind(false);
        break;

      default:
        break;
    }

    return this.step();
  }
}

export const simulationEngine = new SimulationEngine();
