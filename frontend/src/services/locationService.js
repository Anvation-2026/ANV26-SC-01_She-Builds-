/**
 * Real Device Browser Geolocation Service
 * Uses navigator.geolocation.watchPosition() with throttling and distance filtering
 */

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastPosition = null;
    this.lastTimestamp = 0;
    this.minIntervalMs = 3000; // 3 seconds throttle
    this.minDistanceMeters = 8; // 8 meters distance filter
    this.subscribers = new Set();
    this.errorSubscribers = new Set();
  }

  isSupported() {
    return "geolocation" in navigator;
  }

  startTracking() {
    if (this.isTracking) return;
    if (!this.isSupported()) {
      this.notifyError({ code: "NOT_SUPPORTED", message: "Geolocation not supported by browser" });
      return;
    }

    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleSuccess(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      }
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  handleSuccess(position) {
    const now = Date.now();
    const { latitude, longitude, accuracy, speed, heading } = position.coords;

    // Throttle check
    if (now - this.lastTimestamp < this.minIntervalMs) {
      return;
    }

    const payload = {
      lat: parseFloat(latitude.toFixed(6)),
      lng: parseFloat(longitude.toFixed(6)),
      accuracy: Math.round(accuracy || 10),
      speed: speed !== null ? Math.round(speed * 3.6) : 0, // km/h
      heading: heading !== null ? Math.round(heading) : 0,
      timestamp: now
    };

    this.lastPosition = payload;
    this.lastTimestamp = now;

    this.subscribers.forEach(cb => cb(payload));
  }

  handleError(error) {
    let message = "Unknown geolocation error";
    let code = "UNKNOWN";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        code = "PERMISSION_DENIED";
        message = "Location permission denied. Please allow location access to track real position.";
        break;
      case error.POSITION_UNAVAILABLE:
        code = "POSITION_UNAVAILABLE";
        message = "GPS location unavailable.";
        break;
      case error.TIMEOUT:
        code = "TIMEOUT";
        message = "GPS location request timed out.";
        break;
      default:
        break;
    }

    this.notifyError({ code, message });
  }

  notifyError(errObj) {
    this.errorSubscribers.forEach(cb => cb(errObj));
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    if (this.lastPosition) callback(this.lastPosition);
    return () => this.subscribers.delete(callback);
  }

  subscribeError(callback) {
    this.errorSubscribers.add(callback);
    return () => this.errorSubscribers.delete(callback);
  }
}

export const locationService = new LocationService();
