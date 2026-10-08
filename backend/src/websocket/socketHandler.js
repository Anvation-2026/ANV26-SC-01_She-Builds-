/**
 * Real-Time Socket.IO Coordination Layer
 * Handles live location broadcasting, deviation alerts, regrouping, and simulation streams
 */

import { Server } from "socket.io";
import { rideService } from "../rides/rideService.js";
import { simulationEngine } from "../simulation/simulationEngine.js";
import { db } from "../database/spatialStore.js";

export function initializeWebSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    let currentRideId = null;
    let currentUserId = null;

    // Join Ride Room: ride:{rideId}
    socket.on("ride:join", ({ rideId, userId, name }) => {
      currentRideId = rideId;
      currentUserId = userId;
      const room = `ride:${rideId}`;
      socket.join(room);

      const rideData = rideService.getRide(rideId);
      socket.emit("ride:state:initial", {
        ride: rideData?.ride,
        members: rideData?.members,
        activeHazards: db.hazards.filter(h => h.active)
      });

      socket.to(room).emit("rider:joined", {
        userId,
        name,
        timestamp: Date.now()
      });
    });

    // Leave Ride
    socket.on("ride:leave", ({ rideId, userId }) => {
      const room = `ride:${rideId}`;
      socket.leave(room);
      socket.to(room).emit("rider:left", { userId, timestamp: Date.now() });
    });

    // Live Rider GPS Update (from real navigator.geolocation.watchPosition)
    socket.on("rider:location:update", ({ rideId, userId, location, timestamp }) => {
      const room = `ride:${rideId}`;
      const result = rideService.updateLocation(rideId, userId, location);

      if (result) {
        // Broadcast location update to other members in the room
        socket.to(room).emit("rider:location:broadcast", {
          rideId,
          userId,
          location,
          timestamp,
          member: result.member,
          relativeDistances: result.relativeDistances
        });

        // Send caller their relative distances and deviation analysis
        socket.emit("rider:analysis:update", {
          relativeDistances: result.relativeDistances,
          deviationResult: result.deviationResult,
          separation: result.separation,
          proximityAlerts: result.proximityAlerts
        });

        // Broadcast deviation alert if persistent off-route
        if (result.deviationResult.isOffRoute) {
          io.to(room).emit("group:deviation:alert", {
            userId,
            name: result.member.name,
            distance: result.deviationResult.distance,
            status: result.deviationResult.status,
            message: result.deviationResult.message,
            timestamp: Date.now()
          });
        }

        // Broadcast separation alert if group split
        if (result.separation.status !== "GROUPED") {
          io.to(room).emit("group:separation:alert", {
            separation: result.separation,
            timestamp: Date.now()
          });
        }

        // Broadcast proximity notifications
        if (result.proximityAlerts.length > 0) {
          result.proximityAlerts.forEach(alert => {
            io.to(room).emit("group:proximity:alert", alert);
          });
        }
      }
    });

    // Leader requests Regroup Point
    socket.on("ride:regroup:request", ({ rideId }) => {
      const regroup = rideService.requestRegroup(rideId);
      if (regroup && regroup.success) {
        io.to(`ride:${rideId}`).emit("ride:regroup:broadcast", {
          regroupPoint: regroup.regroupPoint,
          timestamp: Date.now()
        });
      }
    });

    // Leader applies dynamic reroute to group
    socket.on("ride:reroute:apply", ({ rideId, rerouteOption }) => {
      const updatedRide = rideService.applyReroute(rideId, rerouteOption);
      if (updatedRide) {
        io.to(`ride:${rideId}`).emit("ride:reroute:broadcast", {
          ride: updatedRide,
          rerouteOption,
          timestamp: Date.now()
        });
      }
    });

    // Emergency Corridor Toggle
    socket.on("ride:emergency:toggle", ({ rideId, status }) => {
      const updatedRide = rideService.toggleEmergencyCorridor(rideId, status);
      if (updatedRide) {
        io.to(`ride:${rideId}`).emit("ride:emergency:broadcast", {
          emergencyCorridorActive: updatedRide.emergencyCorridorActive,
          timestamp: Date.now()
        });
      }
    });

    socket.on("disconnect", () => {
      if (currentRideId && currentUserId) {
        io.to(`ride:${currentRideId}`).emit("rider:disconnected", {
          userId: currentUserId,
          timestamp: Date.now()
        });
      }
    });
  });

  // Wire simulation ticks to broadcast to all connected clients
  simulationEngine.setOnTick((payload) => {
    io.emit("simulation:tick", payload);
  });

  return io;
}
