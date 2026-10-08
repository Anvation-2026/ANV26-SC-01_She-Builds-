/**
 * Ride Coordination Service
 * Manages group rides, member states, relative distances, route corridors, and regrouping
 */

import { db } from "../database/spatialStore.js";
import { getRelativePosition, calculateDistance } from "../geo/haversine.js";
import { distanceFromRoute, checkRouteDeviation } from "../geo/polyline.js";
import { evaluateGroupSeparation } from "../geo/separation.js";
import { checkProximityAlerts } from "../geo/proximity.js";
import { calculateRegroupPoint } from "../geo/regroup.js";

export class RideService {
  createRide({ name, leaderId, startLocation, destination, waypoints = [], plannedRoute = null }) {
    return db.createRide({
      name,
      leaderId,
      startLocation,
      destination,
      waypoints,
      plannedRoute
    });
  }

  joinRide(code, user) {
    return db.joinRide(code, user);
  }

  getRide(rideId) {
    const ride = db.getRideById(rideId);
    if (!ride) return null;
    const members = db.getRideMembers(rideId);
    return { ride, members };
  }

  getRideByCode(code) {
    return db.getRideByCode(code);
  }

  updateLocation(rideId, userId, locationData) {
    const ride = db.getRideById(rideId);
    if (!ride) return null;

    const member = db.updateRiderLocation(rideId, userId, locationData);
    if (!member) return null;

    const allMembers = db.getRideMembers(rideId);

    // 1. Check Route Deviation if plannedRoute is present
    let deviationResult = { isOffRoute: false, distance: 0, status: "NORMAL" };
    if (ride.plannedRoute && ride.plannedRoute.geometry && ride.plannedRoute.geometry.coordinates) {
      const coords = ride.plannedRoute.geometry.coordinates;
      const distFromPolyline = distanceFromRoute(
        [locationData.lng, locationData.lat],
        coords
      );
      deviationResult = checkRouteDeviation(distFromPolyline);
      member.offRouteState = {
        isOffRoute: deviationResult.isOffRoute,
        distance: distFromPolyline,
        severity: deviationResult.severity,
        status: deviationResult.status,
        message: deviationResult.message,
        intentional: member.offRouteState?.intentional || false
      };
    }

    // 2. Evaluate Group Separation
    const separation = evaluateGroupSeparation(allMembers);

    // 3. Calculate Relative Position of this rider relative to other riders
    const relativeDistances = {};
    const proximityAlerts = [];

    allMembers.forEach(other => {
      if (other.userId !== userId && other.lastLocation) {
        const rel = getRelativePosition(
          locationData,
          locationData.heading,
          other.lastLocation,
          locationData.speed
        );
        relativeDistances[other.userId] = rel;

        // Check proximity alerts for user
        const prox = checkProximityAlerts(
          other.userId,
          rel.distanceMeters,
          other.name,
          member.proximityState || {}
        );
        if (prox.alerts.length > 0) {
          proximityAlerts.push(...prox.alerts);
        }
        member.proximityState = prox.updatedState;
      }
    });

    return {
      member,
      deviationResult,
      separation,
      relativeDistances,
      proximityAlerts,
      allMembers
    };
  }

  requestRegroup(rideId) {
    const ride = db.getRideById(rideId);
    if (!ride) return null;

    const members = db.getRideMembers(rideId);
    const routeCoords = ride.plannedRoute?.geometry?.coordinates || [];
    const regroupData = calculateRegroupPoint(
      members.map(m => ({ location: m.lastLocation })),
      routeCoords
    );

    if (regroupData.success) {
      ride.regroupPoint = regroupData.regroupPoint;
    }
    return regroupData;
  }

  applyReroute(rideId, rerouteOption) {
    const ride = db.getRideById(rideId);
    if (!ride) return null;

    ride.activeReroute = rerouteOption;
    // Update planned route geometry to alternative geometry
    if (rerouteOption && rerouteOption.geometry) {
      ride.plannedRoute = {
        type: "Feature",
        properties: {
          ...ride.plannedRoute?.properties,
          name: `${ride.name} (${rerouteOption.label} Reroute)`,
          reroutedAt: new Date().toISOString(),
          riskScore: rerouteOption.riskScore,
          riskLevel: rerouteOption.riskLevel
        },
        geometry: rerouteOption.geometry
      };
    }
    return ride;
  }

  toggleEmergencyCorridor(rideId, status = null) {
    const ride = db.getRideById(rideId);
    if (!ride) return null;

    ride.emergencyCorridorActive = status !== null ? status : !ride.emergencyCorridorActive;
    return ride;
  }
}

export const rideService = new RideService();
