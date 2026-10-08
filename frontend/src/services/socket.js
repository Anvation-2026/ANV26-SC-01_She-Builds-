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
    this.activeRideId = null;
  }

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      auth: { token: localStorage.getItem("rider-token") },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      console.log("[Socket] Connected to backend coordination server:", this.socket.id);
      if (this.activeRideId) this.socket.emit("ride:join", { rideId: this.activeRideId });
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      console.log("[Socket] Disconnected from backend");
    });

    return this.socket;
  }

  joinRide(rideId) {
    if (!this.socket) this.connect();
    this.activeRideId = rideId;
    if (this.socket.connected) this.socket.emit("ride:join", { rideId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
    this.activeRideId = null;
  }

  leaveRide(rideId, userId) {
    if (!this.socket) return;
    if (this.activeRideId === rideId) this.activeRideId = null;
    if (this.socket.connected) this.socket.emit("ride:leave", { rideId, userId });
  }

  sendLocationUpdate(rideId, location) {
    if (!this.socket) return;
    this.socket.emit("rider:location:update", {
      rideId,
      location,
      timestamp: Date.now()
    });
  }

  stopLocationSharing(rideId) {
    this.socket?.emit("rider:location:stop", { rideId });
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
