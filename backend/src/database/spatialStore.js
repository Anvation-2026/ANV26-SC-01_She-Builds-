/**
 * Spatial Data Store & Repository
 * Fast spatial indexing and querying abstraction
 */

import { calculateDistance } from "../geo/haversine.js";
import { User, Ride, RideMember, Hazard, Event, CommunityReport } from "./models.js";

class SpatialStore {
  constructor() {
    this.users = new Map();
    this.rides = new Map();
    this.ridesByCode = new Map();
    this.members = new Map(); // rideId -> Map<userId, RideMember>
    this.locations = new Map(); // rideId -> Map<userId, Location>
    this.locationHistory = new Map(); // userId -> Array<Location>
    this.hazards = [];
    this.events = [];
    this.reports = [];
    this.emergencyCorridors = [];

    this.initializeSeedData();
  }

  initializeSeedData() {
    // Default Squad Users
    const defaultUsers = [
      new User({ id: "user-leader", name: "Vikram (Leader)", role: "LEADER", avatar: "⭐" }),
      new User({ id: "user-rahul", name: "Rahul", role: "RIDER", avatar: "🔵" }),
      new User({ id: "user-akash", name: "Akash", role: "RIDER", avatar: "🟣" }),
      new User({ id: "user-vivek", name: "Vivek", role: "RIDER", avatar: "🟠" }),
      new User({ id: "user-arjun", name: "Arjun", role: "SWEEPER", avatar: "🟢" })
    ];
    defaultUsers.forEach(u => this.users.set(u.id, u));

    // Flood & Waterlogging Hazard Zones
    this.hazards = [
      new Hazard({
        id: "HZ-001",
        name: "Richmond Circle / Hosur Underpass",
        corridor: "koramangala",
        type: "FLOODING",
        severity: 95,
        confidence: 94,
        blocked: true,
        roadStatus: "CRITICAL",
        latitude: 12.9560,
        longitude: 77.5990,
        radiusMeters: 650,
        waterDepth: "3.5 ft",
        active: false,
        description: "Severe underpass waterlogging 3.5 ft deep. Multiple vehicles stalled and submerged."
      }),
      new Hazard({
        id: "HZ-002",
        name: "Shanti Nagar Double Road",
        corridor: "koramangala",
        type: "WATERLOGGING",
        severity: 75,
        confidence: 88,
        blocked: false,
        roadStatus: "HAZARDOUS",
        latitude: 12.9510,
        longitude: 77.5940,
        radiusMeters: 550,
        waterDepth: "1.8 ft",
        active: false,
        description: "Heavy side-drain overflow. Traffic crawling at 5 km/h across flooded lanes."
      }),
      new Hazard({
        id: "HZ-003",
        name: "Adugodi / Koramangala Link Underpass",
        corridor: "koramangala",
        type: "FLOODING",
        severity: 90,
        confidence: 91,
        blocked: true,
        roadStatus: "CRITICAL",
        latitude: 12.9430,
        longitude: 77.6110,
        radiusMeters: 650,
        waterDepth: "4.0 ft",
        active: false,
        description: "Flash flood breach from major stormwater canal. Road submerged."
      }),
      new Hazard({
        id: "HZ-007",
        name: "Halasuru / Old Madras Road Underpass",
        corridor: "indiranagar",
        type: "FLOODING",
        severity: 92,
        confidence: 90,
        blocked: true,
        roadStatus: "CRITICAL",
        latitude: 12.9780,
        longitude: 77.6260,
        radiusMeters: 650,
        waterDepth: "3.2 ft",
        active: false,
        description: "Severe stormwater runoff overflow near Halasuru lake underpass."
      }),
      new Hazard({
        id: "HZ-008",
        name: "Silk Board Junction Underpass",
        corridor: "electronic_city",
        type: "FLOODING",
        severity: 96,
        confidence: 96,
        blocked: true,
        roadStatus: "CRITICAL",
        latitude: 12.9175,
        longitude: 77.6235,
        radiusMeters: 800,
        waterDepth: "4.5 ft",
        active: false,
        description: "Catastrophic waterlogging 4.5 ft deep. Submerged junction and flyover ramp blocks."
      }),
      new Hazard({
        id: "HZ-010",
        name: "Marathahalli Underpass Flooding",
        corridor: "whitefield",
        type: "FLOODING",
        severity: 94,
        confidence: 93,
        blocked: true,
        roadStatus: "CRITICAL",
        latitude: 12.9560,
        longitude: 77.7010,
        radiusMeters: 800,
        waterDepth: "3.8 ft",
        active: false,
        description: "Underpass inundated from lake breach. Water level above car hoods."
      })
    ];

    // Protests, Strikes & Public Events
    this.events = [
      new Event({
        id: "EV-001",
        name: "City Transport Workers Strike & Blockade",
        type: "STRIKE",
        latitude: 12.9680,
        longitude: 77.6080,
        affectedCorridor: "Brigade Road / Richmond Road",
        expectedAttendance: 18000,
        trafficImpact: "CRITICAL",
        roadCapacityReduction: 0.50,
        policeDiversion: true,
        status: "ACTIVE",
        description: "Transport union civil strike. Auto-rickshaw and cab blockades across arterial junctions."
      }),
      new Event({
        id: "EV-002",
        name: "Civic Public Protest & March",
        type: "PROTEST",
        latitude: 12.9730,
        longitude: 77.6175,
        affectedCorridor: "Trinity Circle / MG Road",
        expectedAttendance: 12000,
        trafficImpact: "HIGH",
        roadCapacityReduction: 0.40,
        policeDiversion: true,
        status: "ACTIVE",
        description: "Mass public assembly and protest rally at Trinity Circle. Inbound lanes barricaded."
      }),
      new Event({
        id: "EV-003",
        name: "Open Street Festival & Cultural Gathering",
        type: "FESTIVAL",
        latitude: 12.9770,
        longitude: 77.6385,
        affectedCorridor: "100 Feet Road Indiranagar",
        expectedAttendance: 25000,
        trafficImpact: "HIGH",
        roadCapacityReduction: 0.45,
        policeDiversion: true,
        status: "ACTIVE",
        description: "Annual cultural street carnival. Entire 100 Feet Road pedestrianized and closed to motor vehicles."
      }),
      new Event({
        id: "EV-004",
        name: "Freedom Park Civic Assembly",
        type: "PROTEST",
        latitude: 12.9810,
        longitude: 77.5850,
        affectedCorridor: "Sheshadri Road / Anand Rao Circle",
        expectedAttendance: 15000,
        trafficImpact: "HIGH",
        roadCapacityReduction: 0.35,
        policeDiversion: true,
        status: "SCHEDULED",
        description: "State employee association protest march towards city center."
      })
    ];

    // Initial Community Reports
    this.reports = [
      new CommunityReport({
        id: "REP-101",
        userId: "user-akash",
        type: "FLOODING",
        latitude: 12.9565,
        longitude: 77.5995,
        description: "Underpass water rising rapidly past wheel height. Autos stalled in 3 ft water.",
        severity: 90,
        trustScore: 88,
        gpsAccuracy: 5,
        photoEvidence: true
      }),
      new CommunityReport({
        id: "REP-102",
        userId: "user-vivek",
        type: "ROAD_BLOCKED",
        latitude: 12.9680,
        longitude: 77.6080,
        description: "Police barricades set up for transport strike on Brigade Road junction.",
        severity: 85,
        trustScore: 92,
        gpsAccuracy: 6,
        photoEvidence: true
      }),
      new CommunityReport({
        id: "REP-103",
        userId: "user-arjun",
        type: "PROTEST",
        latitude: 12.9730,
        longitude: 77.6175,
        description: "Protestors gathered at Trinity Circle. Northbound traffic completely halted.",
        severity: 88,
        trustScore: 95,
        gpsAccuracy: 4,
        photoEvidence: true
      })
    ];

    // Create Initial Demo Ride: "Bengaluru Urban Express"
    const demoRide = new Ride({
      id: "ride-demo-01",
      code: "782914",
      name: "Bengaluru Urban Express",
      leaderId: "user-leader",
      startLocation: { name: "Cubbon Park Central", lat: 12.9716, lng: 77.5946 },
      destination: { name: "Koramangala Sony World", lat: 12.9352, lng: 77.6245 },
      status: "ACTIVE"
    });
    this.rides.set(demoRide.id, demoRide);
    this.ridesByCode.set(demoRide.code, demoRide);

    const rideMembersMap = new Map();
    defaultUsers.forEach(user => {
      const member = new RideMember({
        rideId: demoRide.id,
        userId: user.id,
        name: user.name,
        role: user.role === "LEADER" ? "LEADER" : "MEMBER",
        status: "ACTIVE"
      });
      rideMembersMap.set(user.id, member);
    });
    this.members.set(demoRide.id, rideMembersMap);
  }

  // --- RIDE METHODS ---
  createRide({ name, leaderId, startLocation, destination, waypoints = [], plannedRoute = null }) {
    let code;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.ridesByCode.has(code));

    const rideId = `ride-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const ride = new Ride({
      id: rideId,
      code,
      name,
      leaderId,
      startLocation,
      destination,
      waypoints,
      plannedRoute,
      status: "ACTIVE"
    });
    ride.startedAt = new Date().toISOString();

    this.rides.set(ride.id, ride);
    this.ridesByCode.set(ride.code, ride);

    const membersMap = new Map();
    const leaderUser = this.users.get(leaderId) || new User({ id: leaderId, name: "Leader" });
    const leaderMember = new RideMember({
      rideId: ride.id,
      userId: leaderId,
      name: leaderUser.name,
      role: "LEADER",
      status: "ACTIVE"
    });
    membersMap.set(leaderId, leaderMember);
    this.members.set(ride.id, membersMap);

    return ride;
  }

  getRideById(rideId) {
    return this.rides.get(rideId);
  }

  getRideByCode(code) {
    return this.ridesByCode.get(code);
  }

  joinRide(code, user) {
    const ride = this.ridesByCode.get(code);
    if (!ride) return null;

    let membersMap = this.members.get(ride.id);
    if (!membersMap) {
      membersMap = new Map();
      this.members.set(ride.id, membersMap);
    }

    if (!membersMap.has(user.id)) {
      const newMember = new RideMember({
        rideId: ride.id,
        userId: user.id,
        name: user.name,
        role: "MEMBER",
        status: "ACTIVE"
      });
      membersMap.set(user.id, newMember);
    }

    return { ride, members: Array.from(membersMap.values()) };
  }

  getRideMembers(rideId) {
    const membersMap = this.members.get(rideId);
    return membersMap ? Array.from(membersMap.values()) : [];
  }

  updateRiderLocation(rideId, userId, locationData) {
    const membersMap = this.members.get(rideId);
    if (!membersMap || !membersMap.has(userId)) return null;

    const member = membersMap.get(userId);
    member.lastLocation = locationData;
    member.lastSeenAt = new Date().toISOString();
    member.status = "ACTIVE";

    let history = this.locationHistory.get(userId);
    if (!history) {
      history = [];
      this.locationHistory.set(userId, history);
    }
    history.push({ ...locationData, timestamp: Date.now() });
    if (history.length > 150) history.shift();

    return member;
  }

  // --- SPATIAL SEARCH HELPERS ---
  findNearbyHazards(lat, lng, radiusMeters = 1000) {
    return this.hazards.filter(h => {
      const d = calculateDistance({ lat, lng }, { lat: h.latitude, lng: h.longitude });
      return d <= (radiusMeters + h.radiusMeters);
    });
  }

  findNearbyEvents(lat, lng, radiusMeters = 2000) {
    return this.events.filter(e => {
      const d = calculateDistance({ lat, lng }, { lat: e.latitude, lng: e.longitude });
      return d <= radiusMeters;
    });
  }
}

export const db = new SpatialStore();
