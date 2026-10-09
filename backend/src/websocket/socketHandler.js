import { Server } from "socket.io";
import { verifyToken } from "../auth/tokens.js";
import { pool } from "../database/postgres.js";
import { db } from "../database/spatialStore.js";
import { rideService } from "../rides/rideService.js";
import { simulationEngine } from "../simulation/simulationEngine.js";
import { checkRouteHazards } from "../routing/routingService.js";
import { calculateDistance } from "../geo/haversine.js";

export function initializeWebSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000", methods: ["GET", "POST"] } });

  io.use((socket, next) => {
    const claims = verifyToken(socket.handshake.auth?.token || "");
    if (!claims) return next(new Error("Authentication required"));
    socket.data.user = claims;
    next();
  });

  io.on("connection", (socket) => {
    let currentRideId = null;
    const user = socket.data.user;
    socket.join(`user:${user.sub}`);

    const clearSharedLocation = async (rideId) => {
      const member = db.getRideMembers(rideId).find((entry) => entry.userId === user.sub);
      if (member) {
        member.lastLocation = null;
        member.lastSeenAt = null;
        member.status = "JOINED";
      }
      db.locationHistory.delete(user.sub);
      io.to(`ride:${rideId}`).emit("rider:location:broadcast", { rideId, userId: user.sub, location: null, timestamp: Date.now(), status: "GPS OFF" });
      await pool.query("DELETE FROM rider_locations WHERE ride_id=$1 AND rider_id=$2", [rideId, user.sub]);
    };

    socket.on("ride:join", async ({ rideId } = {}) => {
      try {
        const { rows: memberRows } = await pool.query(
          "SELECT r.id,r.name,r.email,m.role FROM ride_members m JOIN riders r ON r.id=m.rider_id WHERE m.ride_id=$1 AND m.rider_id=$2",
          [rideId, user.sub]
        );
        if (!memberRows[0]) return socket.emit("ride:error", { message: "You are not a member of that ride." });
        const { rows: rideRows } = await pool.query("SELECT * FROM rides WHERE id=$1 AND status='ACTIVE'", [rideId]);
        if (!rideRows[0]) return socket.emit("ride:error", { message: "This ride has ended or is no longer available." });
        const rideRow = rideRows[0];
        if (rideRow.planned_route?.geometry?.coordinates) {
          simulationEngine.setRouteCoordinates(rideRow.planned_route.geometry.coordinates);
        }

        db.users.set(user.sub, { id: user.sub, name: user.name, email: user.email });
        if (!db.getRideById(rideId)) {
          const { rows: allMembers } = await pool.query(
            `SELECT r.id,r.name,m.role,l.updated_at AS last_seen_at,
              ST_Y(l.position::geometry) AS lat, ST_X(l.position::geometry) AS lng,
              l.accuracy_m,l.speed_kph,l.heading
             FROM ride_members m JOIN riders r ON r.id=m.rider_id
             LEFT JOIN rider_locations l ON l.ride_id=m.ride_id AND l.rider_id=m.rider_id
               AND l.updated_at > NOW() - INTERVAL '2 minutes'
             WHERE m.ride_id=$1`, [rideId]
          );
          allMembers.forEach((member) => db.users.set(member.id, { id: member.id, name: member.name }));
          rideService.createRide({ id: rideId, code: rideRow.code.trim(), name: rideRow.name, leaderId: rideRow.leader_id, startLocation: rideRow.start_location, destination: rideRow.destination, plannedRoute: rideRow.planned_route });
          // Rehydrate persisted session state after server restart
          const cachedRide = db.getRideById(rideId);
          if (cachedRide) {
            cachedRide.emergencyCorridorActive = rideRow.emergency_corridor_active ?? false;
            cachedRide.activeReroute = rideRow.active_reroute ?? null;
          }
          allMembers.forEach((member) => db.joinRide(rideRow.code.trim(), { id: member.id, name: member.name }));
          const cachedMembers = new Map(db.getRideMembers(rideId).map((member) => [member.userId, member]));
          allMembers.forEach((row) => {
            const member = cachedMembers.get(row.id);
            if (!member) return;
            member.lastLocation = row.lat == null ? null : {
              lat: Number(row.lat), lng: Number(row.lng), accuracy: row.accuracy_m,
              speed: row.speed_kph, heading: row.heading
            };
            member.lastSeenAt = row.last_seen_at;
            member.status = row.last_seen_at ? "ACTIVE" : "JOINED";
          });
        } else {
          db.joinRide(rideRow.code.trim(), { id: user.sub, name: user.name });
        }

        if (currentRideId && currentRideId !== rideId) {
          const previousRideId = currentRideId;
          socket.data.sharingRideId = null;
          try {
            const otherSharingSockets = (await io.in(`user:${user.sub}`).fetchSockets())
              .filter((connectedSocket) => connectedSocket.id !== socket.id && connectedSocket.data.sharingRideId === previousRideId);
            if (!otherSharingSockets.length) await clearSharedLocation(previousRideId);
          } catch (error) {
            console.error("Could not clear rider location while switching rides:", error.message);
          }
          socket.leave(`ride:${previousRideId}`);
          socket.to(`ride:${previousRideId}`).emit("rider:left", { rideId: previousRideId, userId: user.sub, timestamp: Date.now() });
        }
        currentRideId = rideId;
        socket.join(`ride:${rideId}`);
        const rideData = rideService.getRide(rideId);
        socket.emit("ride:state:initial", { ride: rideData?.ride, members: rideData?.members, activeHazards: db.hazards.filter((hazard) => hazard.active) });
        io.refreshLocationFeeds?.();
        const routeCoordinates = rideData?.ride?.plannedRoute?.geometry?.coordinates;
        if (routeCoordinates) {
          const affected = checkRouteHazards(routeCoordinates, db.hazards.filter((hazard) => hazard.active)).intersectingHazards;
          if (affected.length) socket.emit("ride:hazard:alert", { hazards: affected, timestamp: Date.now() });
          const nearbyEvents = db.events.filter((event) => event.status === "ACTIVE" && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
            && routeCoordinates.some(([lng, lat]) => calculateDistance({ lat, lng }, { lat: event.latitude, lng: event.longitude }) <= (event.radiusMeters || 2_000)));
          if (nearbyEvents.length) socket.emit("ride:event:alert", { rideId, events: nearbyEvents, timestamp: Date.now() });
        }
        socket.to(`ride:${rideId}`).emit("rider:joined", { userId: user.sub, name: user.name, timestamp: Date.now() });
      } catch (error) {
        console.error("Socket ride join failed:", error);
        socket.emit("ride:error", { message: "Could not connect to this ride." });
      }
    });

    socket.on("ride:leave", async ({ rideId } = {}) => {
      if (rideId !== currentRideId) return;
      socket.data.sharingRideId = null;
      try {
        const otherSharingSockets = (await io.in(`user:${user.sub}`).fetchSockets())
          .filter((connectedSocket) => connectedSocket.id !== socket.id && connectedSocket.data.sharingRideId === rideId);
        if (!otherSharingSockets.length) await clearSharedLocation(rideId);
      } catch (error) {
        console.error("Could not clear rider location while leaving ride:", error.message);
      }
      socket.leave(`ride:${rideId}`);
      socket.to(`ride:${rideId}`).emit("rider:left", { rideId, userId: user.sub, timestamp: Date.now() });
      currentRideId = null;
    });

    socket.on("rider:location:update", async ({ rideId, location } = {}) => {
      if (!rideId || rideId !== currentRideId || !location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng) || location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) return;
      try {
        socket.data.sharingRideId = rideId;
        const result = rideService.updateLocation(rideId, user.sub, location);
        if (!result) return;
        await pool.query(
          `INSERT INTO rider_locations(ride_id,rider_id,position,accuracy_m,speed_kph,heading,updated_at)
           VALUES($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography,$5,$6,$7,NOW())
           ON CONFLICT(ride_id,rider_id) DO UPDATE SET position=EXCLUDED.position,accuracy_m=EXCLUDED.accuracy_m,speed_kph=EXCLUDED.speed_kph,heading=EXCLUDED.heading,updated_at=NOW()`,
          [rideId, user.sub, location.lng, location.lat, location.accuracy ?? null, location.speed ?? null, location.heading ?? null]
        );
        const room = `ride:${rideId}`;
        socket.to(room).emit("rider:location:broadcast", { rideId, userId: user.sub, location, timestamp: Date.now(), member: result.member, relativeDistances: result.relativeDistances });
        socket.emit("rider:analysis:update", { relativeDistances: result.relativeDistances, deviationResult: result.deviationResult, separation: result.separation, proximityAlerts: result.proximityAlerts });
        if (result.deviationResult.isOffRoute) io.to(room).emit("group:deviation:alert", { userId: user.sub, name: user.name, distance: result.deviationResult.distance, status: result.deviationResult.status, message: result.deviationResult.message, timestamp: Date.now() });
        if (result.separation.status !== "GROUPED") io.to(room).emit("group:separation:alert", { separation: result.separation, timestamp: Date.now() });
        result.proximityAlerts.forEach((alert) => io.to(room).emit("group:proximity:alert", alert));
      } catch (error) { console.error("GPS update failed:", error); }
    });

    socket.on("rider:location:stop", async ({ rideId } = {}) => {
      if (!rideId || rideId !== currentRideId) return;
      try {
        socket.data.sharingRideId = null;
        const otherSharingSockets = (await io.in(`user:${user.sub}`).fetchSockets())
          .filter((connectedSocket) => connectedSocket.id !== socket.id && connectedSocket.data.sharingRideId === rideId);
        if (!otherSharingSockets.length) await clearSharedLocation(rideId);
      } catch (error) {
        console.error("Could not clear shared rider location:", error.message);
      }
    });

    socket.on("ride:regroup:request", ({ rideId } = {}) => {
      if (rideId !== currentRideId) return;
      const regroup = rideService.requestRegroup(rideId);
      if (regroup?.success) io.to(`ride:${rideId}`).emit("ride:regroup:broadcast", { regroupPoint: regroup.regroupPoint, timestamp: Date.now() });
    });
    socket.on("ride:reroute:apply", ({ rideId, rerouteOption } = {}) => {
      if (rideId !== currentRideId) return;
      const ride = rideService.applyReroute(rideId, rerouteOption);
      if (ride) io.to(`ride:${rideId}`).emit("ride:reroute:broadcast", { ride, rerouteOption, timestamp: Date.now() });
    });
    socket.on("ride:emergency:toggle", ({ rideId, status } = {}) => {
      if (rideId !== currentRideId) return;
      const ride = rideService.toggleEmergencyCorridor(rideId, status);
      if (ride) io.to(`ride:${rideId}`).emit("ride:emergency:broadcast", { emergencyCorridorActive: ride.emergencyCorridorActive, timestamp: Date.now() });
    });
    socket.on("disconnect", async () => {
      if (!currentRideId) return;
      const disconnectedRideId = currentRideId;
      io.to(`ride:${disconnectedRideId}`).emit("rider:disconnected", { userId: user.sub, timestamp: Date.now() });
      try {
        const otherSharingSockets = (await io.in(`user:${user.sub}`).fetchSockets())
          .filter((connectedSocket) => connectedSocket.id !== socket.id && connectedSocket.data.sharingRideId === disconnectedRideId);
        if (!otherSharingSockets.length) await clearSharedLocation(disconnectedRideId);
      } catch (error) {
        console.error("Could not clear disconnected rider location:", error.message);
      }
    });
  });

  simulationEngine.setOnTick((payload) => io.emit("simulation:tick", {
    ...payload,
    routeCoordinates: simulationEngine.routeCoordinates
  }));
  return io;
}
