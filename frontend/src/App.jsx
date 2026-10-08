import React, { useState, useEffect, useCallback, useRef } from "react";
import GroupMapView from "./components/map/GroupMapView";
import ActiveRidePanel from "./components/ride/ActiveRidePanel";
import EmergencyAlertsPanel from "./components/ride/EmergencyAlertsPanel";
import RiderList from "./components/ride/RiderList";
import CreateRideModal from "./components/ride/CreateRideModal";
import JoinRideModal from "./components/ride/JoinRideModal";
import DisasterRerouteModal from "./components/routing/DisasterRerouteModal";
import SimulationControlsPanel from "./components/simulation/SimulationControlsPanel";
import DisasterIntelligencePanel from "./components/intelligence/DisasterIntelligencePanel";
import ReportHazardModal from "./components/reports/ReportHazardModal";
import NotificationBanner from "./components/alerts/NotificationBanner";
import AuthPanel from "./components/auth/AuthPanel";
import {
  fetchHazards,
  fetchEvents,
  fetchReports,
  fetchMyRide,
  leaveRideApi,
  fetchHealth,
  calculateRoute,
  requestRegroupApi,
  applyRerouteApi,
  toggleEmergencyCorridorApi,
  toggleHazardApi,
  toggleEventApi,
  simulationPlay,
  simulationPause,
  simulationReset,
  simulationStep,
  simulationSpeed,
  loadSimulationScenario,
  triggerRiderAction,
  setAuthToken,
  fetchNearbyEmergencyAlerts,
  createEmergencyAlert,
  acknowledgeEmergencyAlert,
  resolveEmergencyAlert
} from "./services/api";
import { socketService } from "./services/socket";
import { locationService } from "./services/locationService";
import {
  Shield,
  ShieldAlert,
  PlusCircle,
  KeyRound,
  Zap,
  AlertTriangle,
  Users
} from "lucide-react";

function getRelativeRiderPosition(reference, other) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadiusMeters = 6_371_000;
  const lat1 = radians(reference.lat);
  const lat2 = radians(other.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = radians(other.lng - reference.lng);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const distanceMeters = Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const heading = reference.heading ?? 0;
  let angleDifference = (bearing - heading + 360) % 360;
  if (angleDifference > 180) angleDifference -= 360;
  const isAhead = Math.abs(angleDifference) <= 90;
  const distanceFormatted = distanceMeters < 1000
    ? `${distanceMeters} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
  return {
    distanceMeters,
    distanceFormatted,
    isAhead,
    relativeLabel: `${distanceFormatted} ${isAhead ? "ahead" : "behind"}`,
    etaMinutes: Math.max(1, Math.round(distanceMeters / Math.max(reference.speed || 0, 7) / 60))
  };
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rider-user") || "null"); } catch { return null; }
  });
  // Modes & System State
  const controlMode = "SIMULATION";
  const [activeRide, setActiveRide] = useState(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const seenEmergencyAlertIds = useRef(new Set());
  const announcedRouteEventIds = useRef(new Set());
  const [sosSending, setSosSending] = useState(false);
  const lastNearbyFetch = useRef(0);
  const liveRideActive = Boolean(activeRide && isSharingLocation);
  const [riders, setRiders] = useState([]);
  const ridersRef = useRef(riders);
  ridersRef.current = riders;
  const [simulationRiders, setSimulationRiders] = useState([]);
  const simulationRidersRef = useRef(simulationRiders);
  simulationRidersRef.current = simulationRiders;
  const [relativeDistances, setRelativeDistances] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const latestLocation = useRef(null);
  latestLocation.current = userLocation;
  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;
  const simulationFocusSet = useRef(false);
  const getCurrentRouteOrigin = (ride = activeRide) => {
    const position = liveRideActive
      ? latestLocation.current
      : ride ? ride.startLocation : simulationRidersRef.current[0]?.location;
    return position ? { lat: position.lat, lng: position.lng } : ride?.startLocation;
  };
  const [alerts, setAlerts] = useState([]);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true);
  const [alertVoiceEnabled, setAlertVoiceEnabled] = useState(true);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(
    () => typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );
  const alertSoundEnabledRef = useRef(alertSoundEnabled);
  alertSoundEnabledRef.current = alertSoundEnabled;
  const alertVoiceEnabledRef = useRef(alertVoiceEnabled);
  alertVoiceEnabledRef.current = alertVoiceEnabled;
  const lastSpokenRouteAlert = useRef(new Map());
  const lastSpokenHazardAlert = useRef(0);
  const positionAnnouncementState = useRef(new Map());
  const desktopAlertsEnabledRef = useRef(desktopAlertsEnabled);
  desktopAlertsEnabledRef.current = desktopAlertsEnabled;
  const audioContextRef = useRef(null);

  useEffect(() => {
    const enableAudio = () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
    };
    window.addEventListener("pointerdown", enableAudio, { once: true });
    window.addEventListener("keydown", enableAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableAudio);
      window.removeEventListener("keydown", enableAudio);
    };
  }, []);

  // Sidebar Tab: "INTEL" | "COORDINATION" | "SIMULATION"
  const [activeSidebarTab, setActiveSidebarTab] = useState("INTEL");

  // Geospatial & Route State
  const [plannedRoute, setPlannedRoute] = useState(null);
  const [alternativeRoute, setAlternativeRoute] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [events, setEvents] = useState([]);
  const [feedStatus, setFeedStatus] = useState({});
  const [reports, setReports] = useState([]);
  const [emergencyCorridor, setEmergencyCorridor] = useState(false);
  const [regroupPoint, setRegroupPoint] = useState(null);
  const [separationStatus, setSeparationStatus] = useState("GROUPED");
  const [focusLocation, setFocusLocation] = useState(null);
  const [rideDestination, setRideDestination] = useState(null);
  const [isPickingDestination, setIsPickingDestination] = useState(false);

  // Simulation Controls State
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [activeScenario, setActiveScenario] = useState(1);
  const [simulationConditions, setSimulationConditions] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const addAlert = useCallback((alertObj) => {
    const alertMessage = alertObj.message || "";
    const isRouteDeviation = alertObj.type === "deviation"
      || (alertObj.riderName && /route/i.test(alertMessage) && /(off|out|deviat)/i.test(alertMessage));
    const riderNames = (alertObj.riderName || "").split(" and ").filter(Boolean);
    const isPositionUpdate = alertObj.type === "position" && alertObj.riderName;
    const isRouteHazard = alertObj.type === "route-hazard";
    const isEmergencyAlert = alertObj.type === "emergency";
    if (alertVoiceEnabledRef.current && (isRouteDeviation || isPositionUpdate || isRouteHazard || isEmergencyAlert)
      && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const now = Date.now();
      const namesToSpeak = isPositionUpdate
        ? riderNames
        : riderNames.filter((name) => now - (lastSpokenRouteAlert.current.get(name) || 0) > 30_000);
      const canSpeakHazard = (isRouteHazard || isEmergencyAlert) && now - lastSpokenHazardAlert.current > 15_000;
      if (((isRouteHazard || isEmergencyAlert) && canSpeakHazard) || (!isRouteHazard && !isEmergencyAlert && namesToSpeak.length)) {
        if (isRouteHazard) lastSpokenHazardAlert.current = now;
        else if (!isPositionUpdate) namesToSpeak.forEach((name) => lastSpokenRouteAlert.current.set(name, now));
        const spokenMessage = isEmergencyAlert
          ? alertObj.spokenMessage || alertObj.message
          : isRouteHazard
          ? alertObj.spokenMessage || "Hazard reported on your route. Check the safer route option."
          : isPositionUpdate
            ? alertObj.spokenMessage
            : namesToSpeak.map((name) => `${name} is going out of the route.`).join(" ");
        const utterance = new window.SpeechSynthesisUtterance(spokenMessage);
        utterance.lang = "en-IN";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        const indianEnglishVoice = window.speechSynthesis.getVoices()
          .find((voice) => /^en-in$/i.test(voice.lang));
        if (indianEnglishVoice) utterance.voice = indianEnglishVoice;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }

    if (alertSoundEnabledRef.current && audioContextRef.current) {
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      const isUrgentAlert = alertObj.type === "danger" || alertObj.type === "route-hazard" || alertObj.type === "emergency";
      oscillator.frequency.setValueAtTime(isUrgentAlert ? 880 : 660, now);
      oscillator.frequency.exponentialRampToValueAtTime(isUrgentAlert ? 660 : 520, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.23);
    }

    if (desktopAlertsEnabledRef.current && document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
      const notificationMessage = alertObj.message || "There is a new update for your ride.";
      const notificationAlreadyNamesRider = (alertObj.riderName || "").split(" and ")
        .filter(Boolean)
        .some((name) => notificationMessage.toLowerCase().startsWith(name.toLowerCase()));
      const namedRiderPrefix = alertObj.riderName && !notificationAlreadyNamesRider
        ? `${alertObj.riderName}: `
        : "";
      const notification = new Notification(alertObj.title || "Rider safety alert", {
        body: `${namedRiderPrefix}${notificationMessage}`
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    setAlerts((prev) => [
      { id: Date.now() + Math.random(), timestamp: Date.now(), ...alertObj },
      ...prev.slice(0, 4)
    ]);
  }, []);

  const announceRiderPosition = (userId, riderName, relative) => {
    const currentDistance = Number(relative?.distanceMeters);
    if (!userId || !riderName || !Number.isFinite(currentDistance)) return;
    if (currentDistance < 800) {
      positionAnnouncementState.current.delete(userId);
      return;
    }
    if (currentDistance < 1000) return;

    const kilometerBand = Math.floor(currentDistance / 1000);
    const direction = relative.isAhead ? "ahead" : "behind";
    const currentBand = `${kilometerBand}:${direction}`;
    if (positionAnnouncementState.current.get(userId) === currentBand) return;
    positionAnnouncementState.current.set(userId, currentBand);

    const positionMessage = `${riderName} is ${kilometerBand} km ${direction} of you.`;
    addAlert({
      type: "position",
      title: "Rider position update",
      riderName,
      message: positionMessage,
      spokenMessage: positionMessage
    });
  };

  const enableDesktopAlerts = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setDesktopAlertsEnabled(permission === "granted");
    if (permission === "granted") {
      addAlert({ type: "info", title: "Desktop alerts enabled", message: "Ride alerts can now appear when this tab is in the background." });
    }
  };

  const handleAuthenticated = (session) => {
    setAuthToken(session.token);
    localStorage.setItem("rider-user", JSON.stringify(session.user));
    setUser(session.user);
  };


  // Load current backend data. Rides are entered by creating or joining a group.
  useEffect(() => {
    if (!user) return;
    async function initData() {
      try {
        const [hazardsRes, eventsRes, reportsRes, myRideRes, healthRes] = await Promise.all([
          fetchHazards(),
          fetchEvents(),
          fetchReports(),
          fetchMyRide(),
          fetchHealth()
        ]);

        if (hazardsRes?.success) setHazards(hazardsRes.hazards);
        if (eventsRes?.success) setEvents(eventsRes.events);
        if (reportsRes?.success) setReports(reportsRes.reports);
        if (healthRes?.feeds) setFeedStatus(healthRes.feeds);
        if (myRideRes?.success && myRideRes.ride) {
          setActiveRide(myRideRes.ride);
          setRiders(myRideRes.members || []);
          setPlannedRoute(myRideRes.ride.plannedRoute || null);
          setEmergencyCorridor(Boolean(myRideRes.ride.emergencyCorridorActive));
        }

        const initialSimulation = await simulationStep();
        if (initialSimulation?.success) setSimulationRiders(initialSimulation.riders || []);

      } catch (err) {
        console.error("Initialization error:", err);
      }
    }

    initData();
    const healthRefresh = window.setInterval(() => {
      void fetchHealth().then((response) => { if (response?.feeds) setFeedStatus(response.feeds); });
    }, 30_000);
    return () => window.clearInterval(healthRefresh);
  }, [user]);

  // Socket.IO Setup
  useEffect(() => {
    if (!user) return;
    const socket = socketService.connect();

    const refreshRouteForHazard = async () => {
      if (!activeRide) return;
      const routeData = await calculateRoute({
        origin: getCurrentRouteOrigin(activeRide),
        destination: activeRide.destination
      });
      if (!routeData?.success) {
        addAlert({ type: "warning", title: "Could not refresh route", message: "A hazard was reported, but route alternatives could not be loaded. Try Safe Rerouting." });
        return;
      }
      setRouteAlternatives(routeData.alternatives || null);
      if (routeData.hasDisasterRisk && routeData.alternatives?.safest) {
        setAlternativeRoute(routeData.alternatives.safest);
        const hazardNames = (routeData.intersectingHazards || []).map((hazard) => hazard.name).filter(Boolean);
        addAlert({
          type: "route-hazard",
          title: "Hazard on your route",
          message: `${hazardNames.join(", ") || "A reported incident"} intersects the planned route. Open Safe Rerouting if you want to compare alternatives.`,
          spokenMessage: `Hazard on your route. ${hazardNames.join(". ") || "A reported incident"}. You can review alternatives using Safe Rerouting.`
        });
      }
    };

    const unsubLocation = socketService.on("rider:location:broadcast", (data) => {
      setRiders((prev) =>
        prev.map((r) => {
          const uId = r.rider ? r.rider.userId : r.userId;
          if (uId === data.userId) {
            return {
              ...r,
              location: data.location,
              lastLocation: data.location,
              status: data.location ? "ACTIVE" : "GPS OFF"
            };
          }
          return r;
        })
      );
    });
    const unsubRideState = socketService.on("ride:state:initial", ({ ride, members, activeHazards = [] }) => {
      if (!ride || ride.id !== activeRide?.id) return;
      setRiders(members || []);
      setPlannedRoute(ride.plannedRoute || null);
      setEmergencyCorridor(Boolean(ride.emergencyCorridorActive));
      if (activeHazards.length) setHazards((current) => {
        const byId = new Map(current.map((hazard) => [hazard.id, hazard]));
        activeHazards.forEach((hazard) => byId.set(hazard.id, hazard));
        return [...byId.values()];
      });
    });

    const unsubDeviation = socketService.on("group:deviation:alert", (data) => {
      addAlert({
        type: "deviation",
        title: "⚠️ Route Deviation Alert",
        riderName: data.name,
        message: `${data.name} is off the planned route corridor by ${data.distance}m.`
      });
    });

    const unsubSeparation = socketService.on("group:separation:alert", (data) => {
      setSeparationStatus(data.separation.status);
      if (data.separation.status === "CRITICAL_SEPARATION" || data.separation.status === "SEPARATED") {
        addAlert({
          type: "danger",
          title: "🚨 Group Separation Warning",
          riderName: (data.separation.separatedRiders || []).map((rider) => rider.name).filter(Boolean).join(" and "),
          message: data.separation.message
        });
      }
    });

    const unsubProximity = socketService.on("group:proximity:alert", (data) => {
      addAlert({
        type: "proximity",
        title: "📍 Squad Proximity Update",
        message: data.message
      });
    });

    const unsubRegroup = socketService.on("ride:regroup:broadcast", (data) => {
      setRegroupPoint(data.regroupPoint);
      addAlert({
        type: "info",
        title: "🏁 Regroup Point Designated",
        message: `Meeting at ${data.regroupPoint.name} (${data.regroupPoint.convergenceMessage})`
      });
    });

    const unsubReroute = socketService.on("ride:reroute:broadcast", (data) => {
      if (data.rerouteOption) {
        const updatedRoute = data.ride?.plannedRoute || data.rerouteOption;
        setPlannedRoute(updatedRoute);
        setActiveRide((current) => current ? { ...current, plannedRoute: updatedRoute } : current);
        setAlternativeRoute(null);
        addAlert({
          type: "info",
          title: "🔄 Group Reroute Applied",
          message: `Switched route to ${data.rerouteOption.label} (${data.rerouteOption.distanceKm} km, ${data.rerouteOption.etaMinutes} min) via ${data.rerouteOption.routeProvider === "TOMTOM" ? "TomTom live traffic" : "OSRM fallback"}.`
        });
      }
    });

    const unsubEmergency = socketService.on("ride:emergency:broadcast", (data) => {
      setEmergencyCorridor(data.emergencyCorridorActive);
    });

    const unsubAnalysis = socketService.on("rider:analysis:update", (data) => {
      const distances = data.relativeDistances || {};
      setRelativeDistances(distances);

      Object.entries(distances).forEach(([userId, relative]) => {
        const rider = ridersRef.current
          .map((item) => item.rider || item)
          .find((item) => (item.userId || item.id) === userId);
        announceRiderPosition(userId, rider?.name, relative);
      });
    });

    const unsubIncident = socketService.on("incident:reported", async ({ report, hazard }) => {
      if (report) {
        setReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
        addAlert({
          type: report.type === "EMERGENCY" || report.type === "ACCIDENT" ? "danger" : "warning",
          title: report.type === "EMERGENCY" ? "Emergency reported nearby" : `${report.type.replaceAll("_", " ")} reported`,
          message: report.description
        });
      }
      const result = await fetchHazards();
      if (result?.success) setHazards(result.hazards);
      if (hazard) await refreshRouteForHazard();
    });

    const unsubTrafficIncidents = socketService.on("traffic:incidents:update", ({ hazards: trafficHazards = [] }) => {
      setHazards((current) => [
        ...current.filter((hazard) => hazard.source !== "TomTom Traffic"),
        ...trafficHazards
      ]);
    });

    const unsubWeather = socketService.on("hazards:feed:update", ({ source, hazards: feedHazards = [] }) => {
      setHazards((current) => [...current.filter((hazard) => hazard.source !== source), ...feedHazards]);
    });

    const unsubEvents = socketService.on("events:feed:update", ({ source, events: feedEvents = [] }) => {
      setEvents((current) => [...current.filter((event) => event.source !== source), ...feedEvents]);
    });

    const unsubRouteEvent = socketService.on("ride:event:alert", ({ rideId, events: routeEvents = [] }) => {
      const unseen = routeEvents.filter((event) => event?.id && !announcedRouteEventIds.current.has(`${rideId || activeRide?.id || ""}:${event.id}`));
      if (!unseen.length) return;
      unseen.forEach((event) => announcedRouteEventIds.current.add(`${rideId || activeRide?.id || ""}:${event.id}`));
      const names = unseen.map((event) => event.name).filter(Boolean).slice(0, 3);
      addAlert({
        type: "warning",
        title: "Public event listed near your route",
        message: `${names.join(", ") || "A public event"} is listed near this route. Possible congestion only; no crowd size or road closure is confirmed.`
      });
    });

    const mergeEmergencyAlert = (alert) => {
      if (!alert?.id) return;
      const alreadySeen = seenEmergencyAlertIds.current.has(alert.id);
      seenEmergencyAlertIds.current.add(alert.id);
      setEmergencyAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 30));
      if (!alreadySeen && alert.createdBy !== (user.id || user.userId)) {
        const message = `${alert.riderName || "A rider"} needs emergency assistance.`;
        addAlert({ type: "emergency", title: "SOS nearby", message, spokenMessage: `Emergency alert. ${message}` });
      }
    };
    const unsubEmergencyAlert = socketService.on("emergency:alert", ({ alert }) => mergeEmergencyAlert(alert));
    const unsubEmergencyUpdate = socketService.on("emergency:update", ({ alert }) => {
      if (alert?.id) setEmergencyAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 30));
    });
    const unsubRiderJoined = socketService.on("rider:joined", async () => {
      if (!activeRide) return;
      const response = await fetchMyRide();
      if (response?.success && response.ride?.id === activeRide.id) setRiders(response.members || []);
    });
    const unsubRiderLeft = socketService.on("rider:left", (data) => {
      if (data.rideId && data.rideId !== activeRide?.id) return;
      setRiders((current) => current.filter((rider) => (rider.userId || rider.id || rider.rider?.userId) !== data.userId));
      if (data.userId === (user.id || user.userId)) {
        setIsSharingLocation(false);
        setActiveRide(null);
        setPlannedRoute(null);
        setRouteAlternatives(null);
        setAlternativeRoute(null);
      }
    });
    const unsubRideEnded = socketService.on("ride:ended", (data) => {
      if (!activeRide || data.rideId !== activeRide.id) return;
      setIsSharingLocation(false);
      setActiveRide(null);
      setPlannedRoute(null);
      setRouteAlternatives(null);
      setAlternativeRoute(null);
      setEmergencyCorridor(false);
      if (data.endedBy !== (user.id || user.userId)) {
        addAlert({ type: "info", title: "Group ride ended", message: `${data.endedByName || "The ride leader"} ended this ride for everyone.` });
      }
    });
    const unsubRideError = socketService.on("ride:error", async ({ message }) => {
      if (!activeRide) return;
      const response = await fetchMyRide();
      if (response?.success && (!response.ride || response.ride.id !== activeRide.id)) {
        setIsSharingLocation(false);
        setActiveRide(null);
        setPlannedRoute(null);
        setRouteAlternatives(null);
        setAlternativeRoute(null);
        addAlert({ type: "warning", title: "Ride is no longer active", message: message || "Reconnect to an active ride to continue." });
      }
    });

    const unsubRideHazard = socketService.on("ride:hazard:alert", ({ hazards: affected = [] }) => {
      if (!affected.length) return;
      const hazardNames = affected.map((hazard) => hazard.name).filter(Boolean);
      addAlert({
        type: "route-hazard",
        title: "Traffic incident on your group route",
        spokenMessage: `Hazard on your route. ${hazardNames.join(". ") || "Traffic incident"}. Check the safer route option.`,
        message: affected.map((hazard) => `${hazard.name}: ${hazard.description}`).join(" • ")
      });
      void refreshRouteForHazard();
    });

    // Real-Time Simulation Stream Ticks
    const unsubSimTick = socketService.on("simulation:tick", (payload) => {
      if (controlModeRef.current !== "SIMULATION") return;
      if (payload.riders) {
        setSimulationRiders(payload.riders);
        const leader = payload.riders[0];
        if (leader?.location) {
          const simulatedDistances = {};
          payload.riders.slice(1).forEach((entry) => {
            const simulatedRider = entry.rider || entry;
            if (!entry.location || !simulatedRider.userId) return;
            const relative = getRelativeRiderPosition(leader.location, entry.location);
            simulatedDistances[simulatedRider.userId] = relative;
            announceRiderPosition(simulatedRider.userId, simulatedRider.name, relative);
          });
          setRelativeDistances(simulatedDistances);
        }
        if (controlModeRef.current === "SIMULATION" && !simulationFocusSet.current) {
          const firstLocation = payload.riders[0]?.location;
          if (firstLocation) {
            setFocusLocation({ lat: firstLocation.lat, lng: firstLocation.lng, zoom: 14 });
            simulationFocusSet.current = true;
          }
        }
      }
      setSimulationConditions((current) => ({
        ...current,
        ...(payload.environmental || {}),
        hazards: payload.hazards || current?.hazards || [],
        events: payload.events || current?.events || []
      }));
    });

    if (activeRide) socketService.joinRide(activeRide.id);

    return () => {
      if (activeRide) socketService.leaveRide(activeRide.id, user.id || user.userId);
      unsubLocation();
      unsubRideState();
      unsubAnalysis();
      unsubDeviation();
      unsubSeparation();
      unsubProximity();
      unsubRegroup();
      unsubReroute();
      unsubEmergency();
      unsubIncident();
      unsubTrafficIncidents();
      unsubWeather();
      unsubEvents();
      unsubRouteEvent();
      unsubEmergencyAlert();
      unsubEmergencyUpdate();
      unsubRiderJoined();
      unsubRiderLeft();
      unsubRideEnded();
      unsubRideError();
      unsubRideHazard();
      unsubSimTick();
    };
  }, [activeRide, addAlert, user]);

  // GPS sharing starts only after a rider opts in for an active group ride.
  useEffect(() => {
    if (user && activeRide && isSharingLocation) {
      const unsubPos = locationService.subscribe((pos) => {
        setUserLocation(pos);
        setRiders((current) => current.map((rider) => {
          const riderId = rider.userId || rider.id || rider.rider?.userId;
          return riderId === (user.id || user.userId) ? { ...rider, location: pos, lastLocation: pos, status: "ACTIVE" } : rider;
        }));
        socketService.sendLocationUpdate(activeRide.id, pos);
        if (Date.now() - lastNearbyFetch.current > 30_000) {
          lastNearbyFetch.current = Date.now();
          void fetchNearbyEmergencyAlerts(pos).then((response) => {
            if (response?.success) setEmergencyAlerts((current) => {
              const byId = new Map(current.map((alert) => [alert.id, alert]));
              response.alerts.forEach((alert) => {
                byId.set(alert.id, alert);
                if (!seenEmergencyAlertIds.current.has(alert.id) && alert.createdBy !== (user.id || user.userId)) {
                  const message = `${alert.riderName || "A rider"} needs emergency assistance.`;
                  addAlert({ type: "emergency", title: "SOS nearby", message, spokenMessage: `Emergency alert. ${message}` });
                }
                seenEmergencyAlertIds.current.add(alert.id);
              });
              return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 30);
            });
          });
        }
      });

      const unsubErr = locationService.subscribeError((err) => {
        setIsSharingLocation(false);
        addAlert({
          type: "warning",
          title: "GPS Status Notice",
          message: err.message
        });
      });
      locationService.startTracking();

      return () => {
        socketService.stopLocationSharing(activeRide.id);
        unsubPos();
        unsubErr();
        locationService.stopTracking();
      };
    } else {
      locationService.stopTracking();
      setUserLocation(null);
    }
  }, [activeRide, isSharingLocation, addAlert, user]);

  // Simulation Controls Handlers
  const handleSimPlay = async () => {
    setIsSimPlaying(true);
    await simulationPlay();
  };

  const handleSimPause = async () => {
    setIsSimPlaying(false);
    await simulationPause();
  };

  const handleSimReset = async () => {
    setIsSimPlaying(false);
    setAlternativeRoute(null);
    setRegroupPoint(null);
    const res = await simulationReset();
    if (res.success) {
      setSimulationConditions({
        rainfall: res.rainfall,
        traffic: res.traffic,
        eventAttendance: res.eventAttendance || 0,
        risk: res.risk,
        hazards: res.activeHazards || [],
        events: res.activeEvents || []
      });
      setRouteAlternatives(null);
      simulationFocusSet.current = false;
      addAlert({
        type: "success",
        title: "Simulation Reset",
        message: "Baseline nominal conditions and squad formation restored."
      });
    }
  };

  const handleSimStep = async () => {
    await simulationStep();
  };

  const handleSimSpeed = async (mult) => {
    setSimSpeed(mult);
    await simulationSpeed(mult);
  };

  const handleLoadScenario = async (scenId) => {
    setActiveScenario(scenId);
    const res = await loadSimulationScenario(scenId);
    if (res.success) {
      const simulatedHazards = res.activeHazards || [];
      const simulatedEvents = res.activeEvents || [];
      setSimulationConditions({
        rainfall: res.rainfall,
        traffic: res.traffic,
        eventAttendance: res.eventAttendance || 0,
        risk: res.risk,
        hazards: simulatedHazards,
        events: simulatedEvents
      });
      simulationFocusSet.current = false;

      const scenarioIncidents = [...simulatedHazards, ...simulatedEvents]
        .map((incident) => incident.name)
        .filter(Boolean);
      const scenarioRiderAlerts = res.riderAlerts || [];
      if (scenarioIncidents.length || scenarioRiderAlerts.length) {
        const namedRiders = scenarioRiderAlerts.map((alert) => alert.riderName).filter(Boolean);
        const riderUpdates = scenarioRiderAlerts.map((alert) => `${alert.riderName} ${alert.message}`);
        const alertParts = [...riderUpdates, ...scenarioIncidents];
        const spokenHazardNames = simulatedHazards.map((hazard) => hazard.name).filter(Boolean);
        addAlert({
          type: simulatedHazards.length ? "route-hazard" : "warning",
          title: `Simulation alert · Scenario ${scenId}`,
          riderName: namedRiders.join(" and "),
          message: `${alertParts.join(". ")}. Check the map and route before continuing.`,
          spokenMessage: `Hazard on your route. ${spokenHazardNames.join(". ")}. Review the route options.`
        });
      }

      // Recompute route for scenario
      if (activeRide) {
        const routeData = await calculateRoute({
          origin: getCurrentRouteOrigin(activeRide),
          destination: activeRide.destination,
          simulatedHazards
        });
        if (routeData.success) {
          setPlannedRoute(routeData.primaryRoute);
          if (routeData.alternatives) {
            setRouteAlternatives(routeData.alternatives);
            if (routeData.hasDisasterRisk) {
              setAlternativeRoute(routeData.alternatives.safest);
              addAlert({
                type: "danger",
                title: "⚠️ Disaster Detected On Planned Route",
                message: `Scenario ${scenId} triggered hazards. Open Safe Rerouting to compare alternatives.`
              });
            } else {
              setAlternativeRoute(null);
              setIsRerouteModalOpen(false);
            }
          }
        }
      }
    }
  };

  const handleRiderAction = async (action) => {
    await triggerRiderAction(action);
  };

  // Group Ride Actions
  const handleRequestRegroup = async () => {
    if (!activeRide) return;
    const res = await requestRegroupApi(activeRide.id);
    if (res.success) {
      socketService.requestRegroup(activeRide.id);
    }
  };

  const handleApplyReroute = async (chosenOption) => {
    if (!activeRide) return;
    const result = await applyRerouteApi(activeRide.id, chosenOption);
    if (!result?.success) {
      addAlert({ type: "danger", title: "Reroute was not applied", message: result?.error || "The server could not update this ride." });
      return;
    }
    const updatedRoute = result.ride?.plannedRoute || chosenOption;
    setPlannedRoute(updatedRoute);
    setActiveRide((current) => current ? { ...current, plannedRoute: updatedRoute } : current);
    setAlternativeRoute(null);
    socketService.applyReroute(activeRide.id, chosenOption);
  };

  const handleToggleEmergency = async () => {
    if (!activeRide) return;
    const res = await toggleEmergencyCorridorApi(activeRide.id);
    if (res.success) {
      setEmergencyCorridor(res.emergencyCorridorActive);
      socketService.toggleEmergencyCorridor(activeRide.id, res.emergencyCorridorActive);
    }
  };

  const handleLeaveRide = async () => {
    if (!activeRide) return;
    const ride = activeRide;
    const response = await leaveRideApi(ride.id);
    if (!response?.success) {
      addAlert({ type: "warning", title: "Could not leave ride", message: response?.error || "Try again." });
      return;
    }
    socketService.leaveRide(ride.id, user.id || user.userId);
    setIsSharingLocation(false);
    setActiveRide(null);
    setPlannedRoute(null);
    setRouteAlternatives(null);
    setAlternativeRoute(null);
    setRegroupPoint(null);
    setEmergencyCorridor(false);
    addAlert({
      type: "info",
      title: response.ended ? "Group ride ended" : "Left group ride",
      message: response.ended ? "The ride has ended for everyone." : `You left "${ride.name}".`
    });
  };

  const handleSendSOS = async () => {
    if (!activeRide || sosSending) return;
    setSosSending(true);
    let location = userLocation;
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)
      || !location.timestamp || Date.now() - location.timestamp > 15_000) {
      try {
        if (!navigator.geolocation) throw new Error("This device does not support GPS location.");
        location = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
          ({ coords, timestamp }) => resolve({
            lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)),
            accuracy: Math.round(coords.accuracy || 0), timestamp
          }),
          (error) => reject(new Error(error.code === error.PERMISSION_DENIED
            ? "Allow location access to attach your position to the SOS."
            : "Could not get your GPS position. Move to an open area and try again.")),
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
        ));
      } catch (error) {
        setSosSending(false);
        addAlert({ type: "danger", title: "SOS location unavailable", message: error.message || "Could not get your location." });
        return;
      }
    }
    const response = await createEmergencyAlert({
      rideId: activeRide.id,
      location: { lat: location.lat, lng: location.lng, accuracy: location.accuracy },
      message: "Rider needs emergency assistance."
    });
    setSosSending(false);
    if (!response?.success) {
      addAlert({ type: "danger", title: "SOS could not be sent", message: response?.error || "Check your connection and try again." });
      return;
    }
    setEmergencyAlerts((current) => [response.alert, ...current.filter((item) => item.id !== response.alert.id)]);
    seenEmergencyAlertIds.current.add(response.alert.id);
    setFocusLocation({ ...response.alert.location, zoom: 15 });
    addAlert({ type: "danger", title: "SOS sent", message: `The alert was saved and online ride members and nearby riders are being notified. ID ${response.alert.id.slice(0, 8)}.` });
  };

  const handleAcknowledgeSOS = async (alertId) => {
    const response = await acknowledgeEmergencyAlert(alertId);
    if (response?.success) setEmergencyAlerts((current) => [response.alert, ...current.filter((item) => item.id !== alertId)]);
    else addAlert({ type: "warning", title: "Could not acknowledge SOS", message: response?.error || "Try again." });
  };

  const handleResolveSOS = async (alertId) => {
    const response = await resolveEmergencyAlert(alertId);
    if (response?.success) setEmergencyAlerts((current) => [response.alert, ...current.filter((item) => item.id !== alertId)]);
    else addAlert({ type: "warning", title: "Could not resolve SOS", message: response?.error || "Try again." });
  };

  // Hazard and Event Toggles
  const handleToggleHazard = async (hazardId) => {
    const res = await toggleHazardApi(hazardId);
    if (res.success) {
      setHazards((prev) =>
        prev.map((h) => (h.id === hazardId ? { ...h, active: !h.active } : h))
      );
      // Recalculate the route if a ride is active.
      if (activeRide) {
        const routeData = await calculateRoute({
          origin: getCurrentRouteOrigin(activeRide),
          destination: activeRide.destination
        });
        if (routeData.success) {
          setRouteAlternatives(routeData.alternatives || null);
          if (routeData.alternatives && routeData.hasDisasterRisk) {
            setAlternativeRoute(routeData.alternatives.safest);
          } else {
            setAlternativeRoute(null);
          }
        }
      }
    }
  };

  const handleToggleEvent = async (eventId) => {
    const res = await toggleEventApi(eventId);
    if (res.success) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, status: e.status === "ACTIVE" ? "RESOLVED" : "ACTIVE" }
            : e
        )
      );
    }
  };

  if (!user) return <AuthPanel onAuthenticate={handleAuthenticated} />;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ------------------------------------------------ */}
      {/* TOP HEADER */}
      {/* ------------------------------------------------ */}
      <header className="h-16 shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-5 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-500 flex items-center justify-center shadow-lg border border-cyan-400/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base tracking-tight text-white">
                ResilientUrban
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">Group rides and road alerts</p>
          </div>
        </div>

        {/* Top Actions: Group Ride Mode / Create / Join / Report */}
        <div className="flex items-center gap-2.5">
          {!activeRide ? (
            <>
              <button
                onClick={() => { setRideDestination(null); setIsCreateModalOpen(true); }}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Start Group Ride
              </button>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Join via Code
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5">
              <span className="text-xs font-medium text-slate-100">{activeRide.name}</span>
              <span className="rounded-md border border-cyan-700 bg-cyan-950 px-3 py-1 font-mono text-sm font-bold tracking-[0.16em] text-cyan-200">
                {activeRide.code}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Report Hazard
          </button>
          <span className="hidden md:inline text-xs text-slate-300">{user.name}</span>
          <button onClick={() => { socketService.disconnect(); setAuthToken(null); localStorage.removeItem("rider-user"); setActiveRide(null); setRiders([]); setUser(null); }} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Log out</button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      {/* ------------------------------------------------ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT SIDEBAR WITH ORGANIZED TABS */}
        <aside className="w-[430px] shrink-0 h-full flex flex-col bg-slate-950/85 border-r border-slate-800/80">
          {/* Tab Navigation Buttons */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSidebarTab("INTEL")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeSidebarTab === "INTEL"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/50"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>⚡ Urban Intel</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("COORDINATION")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeSidebarTab === "COORDINATION"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>🚴 Squad ({activeRide ? riders.length : simulationRiders.length})</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("SIMULATION")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeSidebarTab === "SIMULATION"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-900/50"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🎮 Simulation</span>
            </button>
          </div>

          {/* Tab Content Container (Clean Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {/* TAB 1: URBAN DISASTER INTELLIGENCE */}
            {activeSidebarTab === "INTEL" && (
              <DisasterIntelligencePanel
                hazards={hazards}
                events={events}
                feedStatus={feedStatus}
                onToggleHazard={handleToggleHazard}
                onToggleEvent={handleToggleEvent}
                onFocusLocation={(loc) => setFocusLocation(loc)}
              />
            )}

            {/* TAB 2: SQUAD RIDE COORDINATION */}
            {activeSidebarTab === "COORDINATION" && (
              <>
                {activeRide && (
                  <ActiveRidePanel
                    ride={activeRide}
                    isLeader={activeRide.leaderId === (user.id || user.userId)}
                    membersCount={riders.length}
                    isSharingLocation={isSharingLocation}
                    onToggleLocationSharing={() => setIsSharingLocation((value) => !value)}
                    onSendSOS={handleSendSOS}
                    sosSending={sosSending}
                    separationStatus={separationStatus}
                    emergencyCorridor={emergencyCorridor}
                    onRequestRegroup={handleRequestRegroup}
                    onToggleEmergency={handleToggleEmergency}
                    onOpenRerouteModal={() => setIsRerouteModalOpen(true)}
                    onEndRide={handleLeaveRide}
                  />
                )}

                <EmergencyAlertsPanel
                  alerts={emergencyAlerts}
                  currentUserId={user.id || user.userId}
                  onAcknowledge={handleAcknowledgeSOS}
                  onResolve={handleResolveSOS}
                  onFocusLocation={setFocusLocation}
                />

                <RiderList
                  riders={activeRide ? riders : simulationRiders}
                  relativeDistances={relativeDistances}
                  live={Boolean(activeRide)}
                />
              </>
            )}

            {/* TAB 3: SIMULATION CONTROLS & SUITE */}
            {activeSidebarTab === "SIMULATION" && (
              <SimulationControlsPanel
                isPlaying={isSimPlaying}
                speedMultiplier={simSpeed}
                activeScenario={activeScenario}
                onPlay={handleSimPlay}
                onPause={handleSimPause}
                onReset={handleSimReset}
                onStep={handleSimStep}
                onSetSpeed={handleSimSpeed}
                onLoadScenario={handleLoadScenario}
                onRiderAction={handleRiderAction}
                conditions={simulationConditions}
              />
            )}
          </div>
        </aside>

        {/* CENTER / MAIN: Real Leaflet Map View */}
        <main className="flex-1 relative min-w-0 min-h-0 bg-slate-950">
          <NotificationBanner
            alerts={alerts}
            onDismiss={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
            soundEnabled={alertSoundEnabled}
            onToggleSound={() => setAlertSoundEnabled((enabled) => !enabled)}
            speechEnabled={alertVoiceEnabled}
            onToggleSpeech={() => setAlertVoiceEnabled((enabled) => !enabled)}
            desktopEnabled={desktopAlertsEnabled}
            onEnableDesktop={enableDesktopAlerts}
            desktopSupported={typeof window !== "undefined" && "Notification" in window}
          />

          <GroupMapView
            userLocation={liveRideActive ? userLocation : null}
            relativeDistances={relativeDistances}
            riders={activeRide
              ? riders.filter((rider) => (rider.userId || rider.id || rider.rider?.userId) !== (user.id || user.userId))
              : simulationRiders}
            plannedRoute={plannedRoute}
            alternativeRoute={alternativeRoute}
            emergencyCorridor={emergencyCorridor}
            hazards={activeRide ? hazards : simulationConditions?.hazards || []}
            events={activeRide ? events : simulationConditions?.events || []}
            emergencyAlerts={emergencyAlerts}
            reports={reports}
            regroupPoint={regroupPoint}
            focusLocation={focusLocation}
            destination={rideDestination}
            isPickingDestination={isPickingDestination}
            onMapClick={(point) => {
              if (!isPickingDestination) return;
              setRideDestination({ ...point, name: "Selected destination" });
              setIsPickingDestination(false);
              setFocusLocation({ ...point, zoom: 15 });
              setIsCreateModalOpen(true);
            }}
          />
        </main>
      </div>

      {/* MODALS */}
      <CreateRideModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={user}
        startLocation={simulationRiders[0]?.location || null}
        destination={rideDestination}
        onPickDestination={() => { setIsPickingDestination(true); setIsCreateModalOpen(false); }}
        onRideCreated={(ride, members, routeData) => {
          setIsSharingLocation(false);
          setActiveRide(ride);
          if (members && members.length > 0) setRiders(members);
          if (ride.plannedRoute) setPlannedRoute(ride.plannedRoute);
          if (routeData?.alternatives) {
            setRouteAlternatives(routeData.alternatives);
            if (routeData.hasDisasterRisk) {
              setAlternativeRoute(routeData.alternatives.safest);
            } else {
              setAlternativeRoute(null);
            }
          }
          addAlert({
            type: "success",
            title: "Group Ride Started",
            message: `Created "${ride.name}" with code ${ride.code}. Route: ${routeData?.routeProvider === "TOMTOM" ? "TomTom live traffic" : "OSRM fallback (live traffic unavailable)"}.`
          });
        }}
      />

      <JoinRideModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        user={user}
        onRideJoined={(ride, members) => {
          setIsSharingLocation(false);
          setActiveRide(ride);
          if (members && members.length > 0) setRiders(members);
          if (ride.plannedRoute) setPlannedRoute(ride.plannedRoute);
          addAlert({
            type: "success",
            title: "Joined Group Ride",
            message: `Successfully connected to ride "${ride.name}".`
          });
        }}
      />

      <DisasterRerouteModal
        isOpen={isRerouteModalOpen}
        onClose={() => setIsRerouteModalOpen(false)}
        alternatives={routeAlternatives}
        onApplyReroute={handleApplyReroute}
      />

      <ReportHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userLocation={userLocation}
        onReportCreated={(rep) => {
          setReports((prev) => [rep, ...prev]);
          addAlert({
            type: "success",
            title: "Report Published",
            message: `Report ${rep.id} posted with trust score ${rep.trustScore}%.`
          });
        }}
      />
    </div>
  );
}
