/**
 * Socket.IO Singleton Client for Real-Time Group Ride Coordination
 */

import { io } from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin);

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      console.log("[Socket] Connected to backend coordination server:", this.socket.id);
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      console.log("[Socket] Disconnected from backend");
    });

    return this.socket;
  }

  joinRide(rideId, userId, name) {
    if (!this.socket) this.connect();
    this.socket.emit("ride:join", { rideId, userId, name });
  }

  leaveRide(rideId, userId) {
    if (!this.socket) return;
    this.socket.emit("ride:leave", { rideId, userId });
  }

  sendLocationUpdate(rideId, userId, location) {
    if (!this.socket) return;
    this.socket.emit("rider:location:update", {
      rideId,
      userId,
      location,
      timestamp: Date.now()
    });
  }

  requestRegroup(rideId) {
    if (!this.socket) return;
    this.socket.emit("ride:regroup:request", { rideId });
  }

  applyReroute(rideId, rerouteOption) {
    if (!this.socket) return;
    this.socket.emit("ride:reroute:apply", { rideId, rerouteOption });
  }

  toggleEmergencyCorridor(rideId, status) {
    if (!this.socket) return;
    this.socket.emit("ride:emergency:toggle", { rideId, status });
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
    return () => this.socket.off(event, callback);
  }
}

export const socketService = new SocketService();
