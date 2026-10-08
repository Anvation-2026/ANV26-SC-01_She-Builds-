/**
 * ResilientUrban Core Database Models & In-Memory / PostGIS-compatible Entities
 */

export class User {
  constructor({ id, name, role = "rider", avatar = "🚴" }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.avatar = avatar;
    this.createdAt = new Date().toISOString();
  }
}

export class Ride {
  constructor({
    id,
    code,
    name,
    leaderId,
    startLocation,
    destination,
    waypoints = [],
    plannedRoute = null,
    status = "PLANNED" // "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.leaderId = leaderId;
    this.startLocation = startLocation;
    this.destination = destination;
    this.waypoints = waypoints;
    this.plannedRoute = plannedRoute; // GeoJSON LineString Feature
    this.status = status;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.endedAt = null;
    this.activeReroute = null;
    this.emergencyCorridorActive = false;
    this.regroupPoint = null;
  }
}

export class RideMember {
  constructor({
    rideId,
    userId,
    name,
    role = "MEMBER", // "LEADER" | "MEMBER" | "SWEEPER"
    status = "JOINED" // "JOINED" | "ACTIVE" | "OFF_ROUTE" | "DISCONNECTED"
  }) {
    this.rideId = rideId;
    this.userId = userId;
    this.name = name;
    this.role = role;
    this.status = status;
    this.joinedAt = new Date().toISOString();
    this.lastLocation = null;
    this.lastSeenAt = null;
    this.offRouteState = {
      isOffRoute: false,
      distance: 0,
      severity: "NONE",
      intentional: false,
      acknowledgedAt: null
    };
    this.proximityState = {};
  }
}

export class Hazard {
  constructor({
    id,
    name,
    corridor = "general",
    type = "FLOODING", // "FLOODING" | "ROAD_CLOSURE" | "WATERLOGGING" | "ACCIDENT"
    severity = 80,
    confidence = 90,
    blocked = false,
    roadStatus = "HAZARDOUS", // "SAFE" | "CONGESTED" | "AT_RISK" | "HAZARDOUS" | "CRITICAL" | "BLOCKED"
    latitude,
    longitude,
    radiusMeters = 500,
    waterDepth = null,
    active = false,
    description = ""
  }) {
    this.id = id;
    this.name = name;
    this.corridor = corridor;
    this.type = type;
    this.severity = severity;
    this.confidence = confidence;
    this.blocked = blocked;
    this.roadStatus = roadStatus;
    this.latitude = latitude;
    this.longitude = longitude;
    this.radiusMeters = radiusMeters;
    this.waterDepth = waterDepth; // e.g. "3.5 ft" or "1.2 m"
    this.active = active;
    this.description = description;
    this.timestamp = new Date().toISOString();
  }
}

export class Event {
  constructor({
    id,
    name,
    type = "PROTEST", // "STRIKE" | "PROTEST" | "FESTIVAL" | "PUBLIC_GATHERING"
    latitude,
    longitude,
    affectedCorridor = "Central Bengaluru",
    expectedAttendance = 20000,
    trafficImpact = "HIGH", // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    roadCapacityReduction = 0.40, // 40% reduction
    policeDiversion = true,
    startTime = new Date().toISOString(),
    endTime = new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status = "ACTIVE",
    description = ""
  }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.latitude = latitude;
    this.longitude = longitude;
    this.affectedCorridor = affectedCorridor;
    this.expectedAttendance = expectedAttendance;
    this.trafficImpact = trafficImpact;
    this.roadCapacityReduction = roadCapacityReduction;
    this.policeDiversion = policeDiversion;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status;
    this.description = description;
  }
}

export class CommunityReport {
  constructor({
    id,
    userId = "anonymous",
    type = "FLOODING",
    latitude,
    longitude,
    description,
    severity = 80,
    trustScore = 75,
    gpsAccuracy = 8,
    photoEvidence = false
  }) {
    this.id = id;
    this.userId = userId;
    this.type = type;
    this.latitude = latitude;
    this.longitude = longitude;
    this.description = description;
    this.severity = severity;
    this.trustScore = trustScore;
    this.gpsAccuracy = gpsAccuracy;
    this.photoEvidence = photoEvidence;
    this.timestamp = new Date().toISOString();
  }
}
