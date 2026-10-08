/**
 * Spatial Data Store & Repository
 * Fast spatial indexing and querying abstraction
 */

import { calculateDistance } from "../geo/haversine.js";
import { User, Ride, RideMember } from "./models.js";

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

    // Live data is added by reports and ride actions. Simulation fixtures are isolated.
  }

  // --- RIDE METHODS ---
  createRide({ id, code, name, leaderId, startLocation, destination, waypoints = [], plannedRoute = null }) {
    let rideCode = code;
    if (!rideCode) {
      do { rideCode = Math.floor(100000 + Math.random() * 900000).toString(); }
      while (this.ridesByCode.has(rideCode));
    }
    const rideId = id || `ride-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const ride = new Ride({
      id: rideId,
      code: rideCode,
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
