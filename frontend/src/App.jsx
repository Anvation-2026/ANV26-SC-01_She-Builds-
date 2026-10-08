import React, { useState, useEffect, useCallback, useRef } from "react";
import GroupMapView from "./components/map/GroupMapView";
import ActiveRidePanel from "./components/ride/ActiveRidePanel";
import RiderList from "./components/ride/RiderList";
import CreateRideModal from "./components/ride/CreateRideModal";
import JoinRideModal from "./components/ride/JoinRideModal";
import DisasterRerouteModal from "./components/routing/DisasterRerouteModal";
import SimulationControlsPanel from "./components/simulation/SimulationControlsPanel";
import DisasterIntelligencePanel from "./components/intelligence/DisasterIntelligencePanel";
import ReportHazardModal from "./components/reports/ReportHazardModal";
import NotificationBanner from "./components/alerts/NotificationBanner";
import {
  fetchHealth,
  fetchRisk,
  fetchHazards,
  fetchEvents,
  fetchReports,
  calculateRoute,
  fetchRideDetails,
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
  triggerRiderAction
} from "./services/api";
import { socketService } from "./services/socket";
import { locationService } from "./services/locationService";
import {
  Shield,
  ShieldAlert,
  PlusCircle,
  KeyRound,
  Radio,
  Zap,
  AlertTriangle,
  Compass,
  CloudRain,
  Car,
  Droplets,
  Megaphone,
  Users,
  Activity
} from "lucide-react";

export default function App() {
  // Modes & System State
  const [controlMode, setControlMode] = useState("SIMULATION"); // "LIVE" | "SIMULATION"
  const [activeRide, setActiveRide] = useState(null);
  const [riders, setRiders] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Sidebar Tab: "INTEL" | "COORDINATION" | "SIMULATION"
  const [activeSidebarTab, setActiveSidebarTab] = useState("INTEL");

  // Geospatial & Route State
  const [plannedRoute, setPlannedRoute] = useState(null);
  const [alternativeRoute, setAlternativeRoute] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [emergencyCorridor, setEmergencyCorridor] = useState(false);
  const [regroupPoint, setRegroupPoint] = useState(null);
  const [separationStatus, setSeparationStatus] = useState("GROUPED");
  const [focusLocation, setFocusLocation] = useState(null);

  // Environmental Telemetry
  const [rainfall, setRainfall] = useState(12);
  const [traffic, setTraffic] = useState(35);
  const [riskData, setRiskData] = useState({ score: 25, level: "SAFE" });

  // Simulation Controls State
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [activeScenario, setActiveScenario] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const addAlert = useCallback((alertObj) => {
    setAlerts((prev) => [
      { id: Date.now() + Math.random(), timestamp: Date.now(), ...alertObj },
      ...prev.slice(0, 4)
    ]);
  }, []);

  // Initialize Default Ride, Hazards, Events & Telemetry
  useEffect(() => {
    async function initData() {
      try {
        const [hazardsRes, eventsRes, riskRes, reportsRes, rideRes] = await Promise.all([
          fetchHazards(),
          fetchEvents(),
          fetchRisk(),
          fetchReports(),
          fetchRideDetails("ride-demo-01")
        ]);

        if (hazardsRes?.success) setHazards(hazardsRes.hazards);
        if (eventsRes?.success) setEvents(eventsRes.events);
        if (riskRes?.success) {
          setRiskData({ score: riskRes.score, level: riskRes.level });
          setRainfall(riskRes.rainfall);
          setTraffic(riskRes.traffic);
        }
        if (reportsRes?.success) setReports(reportsRes.reports);

        if (rideRes?.success && rideRes.ride) {
          setActiveRide(rideRes.ride);
          setRiders(rideRes.members || []);
          setEmergencyCorridor(rideRes.ride.emergencyCorridorActive || false);

          // Calculate initial route between Cubbon Park and Koramangala
          const initialRouteData = await calculateRoute({
            origin: rideRes.ride.startLocation,
            destination: rideRes.ride.destination
          });

          if (initialRouteData.success) {
            setPlannedRoute(initialRouteData.primaryRoute);
            if (initialRouteData.alternatives) {
              setRouteAlternatives(initialRouteData.alternatives);
              if (initialRouteData.hasDisasterRisk) {
                setAlternativeRoute(initialRouteData.alternatives.safest);
              }
            }
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }

    initData();
  }, []);

  // Socket.IO Setup
  useEffect(() => {
    const socket = socketService.connect();

    if (activeRide) {
      socketService.joinRide(activeRide.id, "user-leader", "Vikram (Leader)");
    }

    const unsubLocation = socketService.on("rider:location:broadcast", (data) => {
      setRiders((prev) =>
        prev.map((r) => {
          const uId = r.rider ? r.rider.userId : r.userId;
          if (uId === data.userId) {
            return {
              ...r,
              location: data.location,
              lastLocation: data.location,
              status: "ACTIVE"
            };
          }
          return r;
        })
      );
    });

    const unsubDeviation = socketService.on("group:deviation:alert", (data) => {
      addAlert({
        type: "deviation",
        title: "⚠️ Route Deviation Alert",
        message: `${data.name} is off the planned route corridor by ${data.distance}m.`
      });
    });

    const unsubSeparation = socketService.on("group:separation:alert", (data) => {
      setSeparationStatus(data.separation.status);
      if (data.separation.status === "CRITICAL_SEPARATION" || data.separation.status === "SEPARATED") {
        addAlert({
          type: "danger",
          title: "🚨 Group Separation Warning",
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
        setAlternativeRoute(data.rerouteOption);
        addAlert({
          type: "info",
          title: "🔄 Group Reroute Applied",
          message: `Switched route to ${data.rerouteOption.label} corridor (${data.rerouteOption.distanceKm} km).`
        });
      }
    });

    const unsubEmergency = socketService.on("ride:emergency:broadcast", (data) => {
      setEmergencyCorridor(data.emergencyCorridorActive);
    });

    // Real-Time Simulation Stream Ticks
    const unsubSimTick = socketService.on("simulation:tick", (payload) => {
      if (payload.riders) {
        setRiders(payload.riders);
      }
      if (payload.environmental) {
        setRainfall(payload.environmental.rainfall);
        setTraffic(payload.environmental.traffic);
      }
    });

    return () => {
      unsubLocation();
      unsubDeviation();
      unsubSeparation();
      unsubProximity();
      unsubRegroup();
      unsubReroute();
      unsubEmergency();
      unsubSimTick();
    };
  }, [activeRide, addAlert]);

  // Real GPS Device Location Handler (Live Mode)
  useEffect(() => {
    if (controlMode === "LIVE") {
      locationService.startTracking();

      const unsubPos = locationService.subscribe((pos) => {
        setUserLocation(pos);
        if (activeRide) {
          socketService.sendLocationUpdate(activeRide.id, "user-leader", pos);
        }
      });

      const unsubErr = locationService.subscribeError((err) => {
        addAlert({
          type: "warning",
          title: "GPS Status Notice",
          message: err.message
        });
      });

      return () => {
        unsubPos();
        unsubErr();
        locationService.stopTracking();
      };
    } else {
      locationService.stopTracking();
    }
  }, [controlMode, activeRide, addAlert]);

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
      setRainfall(res.rainfall);
      setTraffic(res.traffic);
      setRiskData({ score: res.score || res.risk?.score || 25, level: res.level || res.risk?.level || "SAFE" });
      setHazards((prev) => prev.map((h) => ({ ...h, active: false })));
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
      setRainfall(res.rainfall);
      setTraffic(res.traffic);
      setRiskData({ score: res.score ?? res.risk?.score ?? 25, level: res.level ?? res.risk?.level ?? "SAFE" });
      setHazards(res.activeHazards);

      // Recompute route for scenario
      if (activeRide) {
        const routeData = await calculateRoute({
          origin: activeRide.startLocation,
          destination: activeRide.destination
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
                message: `Scenario ${scenId} triggered hazards. Recommended bypass: ${routeData.alternatives.safest.label}.`
              });
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
    setAlternativeRoute(chosenOption);
    await applyRerouteApi(activeRide.id, chosenOption);
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

  // Hazard and Event Toggles
  const handleToggleHazard = async (hazardId) => {
    const res = await toggleHazardApi(hazardId);
    if (res.success) {
      setHazards((prev) =>
        prev.map((h) => (h.id === hazardId ? { ...h, active: !h.active } : h))
      );
      // Re-fetch risk
      const riskRes = await fetchRisk();
      if (riskRes.success) {
        setRiskData({ score: riskRes.score, level: riskRes.level });
      }
      // Re-calculate route if active ride exists
      if (activeRide) {
        const routeData = await calculateRoute({
          origin: activeRide.startLocation,
          destination: activeRide.destination
        });
        if (routeData.success) {
          setPlannedRoute(routeData.primaryRoute);
          if (routeData.alternatives && routeData.hasDisasterRisk) {
            setAlternativeRoute(routeData.alternatives.safest);
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

  const activeHazardsCount = hazards.filter((h) => h.active).length;
  const activeEventsCount = events.filter((e) => e.status === "ACTIVE").length;
  const avgCorridorSpeed = Math.max(6, Math.round(45 * (1 - traffic / 110)));

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
              <h1 className="font-extrabold text-base tracking-tight text-white uppercase font-mono">
                ResilientUrban
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SYSTEM ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Disaster-Aware Safe Routing & Real-Time Group-Rider Coordination
            </p>
          </div>
        </div>

        {/* Top Actions: Group Ride Mode / Create / Join / Report */}
        <div className="flex items-center gap-2.5">
          {!activeRide ? (
            <>
              <button
                onClick={() => setIsCreateModalOpen(true)}
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
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400">Active Ride:</span>
              <span className="text-xs font-bold text-slate-100">{activeRide.name}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
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
        </div>
      </header>

      {/* ------------------------------------------------ */}
      {/* COMPREHENSIVE LIVE TELEMETRY RIBBON (FIXED TOP STRIP) */}
      {/* ------------------------------------------------ */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-5 py-2 grid grid-cols-2 md:grid-cols-5 gap-2.5 z-20 shadow-md">
        {/* Card 1: Environmental Rainfall */}
        <div
          onClick={() => setActiveSidebarTab("INTEL")}
          className="bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-900/60 group-hover:scale-105 transition">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 block">Rainfall</span>
              <span className="text-xs font-bold font-mono text-cyan-300">{rainfall} mm/hr</span>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            rainfall >= 70 ? "bg-red-950 text-red-400 border border-red-800" :
            rainfall >= 30 ? "bg-amber-950 text-amber-400 border border-amber-800" :
            "bg-emerald-950 text-emerald-400 border border-emerald-800"
          }`}>
            {rainfall >= 70 ? "MONSOON" : rainfall >= 30 ? "HEAVY" : "NORMAL"}
          </span>
        </div>

        {/* Card 2: Traffic Density */}
        <div
          onClick={() => setActiveSidebarTab("INTEL")}
          className="bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-900/60 group-hover:scale-105 transition">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 block">Traffic Density</span>
              <span className="text-xs font-bold font-mono text-amber-300">{traffic}% • {avgCorridorSpeed} km/h</span>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            traffic >= 75 ? "bg-red-950 text-red-400 border border-red-800" :
            traffic >= 50 ? "bg-orange-950 text-orange-400 border border-orange-800" :
            "bg-emerald-950 text-emerald-400 border border-emerald-800"
          }`}>
            {traffic >= 75 ? "GRIDLOCK" : traffic >= 50 ? "CRAWL" : "SMOOTH"}
          </span>
        </div>

        {/* Card 3: Floods & Waterlogging */}
        <div
          onClick={() => setActiveSidebarTab("INTEL")}
          className="bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-900/60 group-hover:scale-105 transition">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 block">Floods & Depth</span>
              <span className="text-xs font-bold font-mono text-cyan-300">
                {activeHazardsCount} Active {activeHazardsCount > 0 ? "(Max 4.5 ft)" : ""}
              </span>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            activeHazardsCount > 0 ? "bg-red-950 text-red-400 border border-red-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800"
          }`}>
            {activeHazardsCount > 0 ? "BLOCKED" : "CLEAR"}
          </span>
        </div>

        {/* Card 4: Protests & Strikes */}
        <div
          onClick={() => setActiveSidebarTab("INTEL")}
          className="bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-900/60 group-hover:scale-105 transition">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 block">Protests & Strikes</span>
              <span className="text-xs font-bold font-mono text-purple-300">
                {activeEventsCount} Active Assemblies
              </span>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            activeEventsCount > 0 ? "bg-purple-950 text-purple-400 border border-purple-800" : "bg-slate-800 text-slate-400"
          }`}>
            {activeEventsCount > 0 ? "DIVERSION" : "NOMINAL"}
          </span>
        </div>

        {/* Card 5: Overall Urban Risk */}
        <div
          onClick={() => setActiveSidebarTab("INTEL")}
          className="bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-900/60 group-hover:scale-105 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 block">Disaster Risk</span>
              <span className="text-xs font-bold font-mono text-red-300">{riskData.score}/100 Index</span>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            riskData.level === "CRITICAL" ? "bg-red-950 text-red-400 border border-red-800 animate-pulse" :
            riskData.level === "HAZARDOUS" ? "bg-amber-950 text-amber-400 border border-amber-800" :
            "bg-emerald-950 text-emerald-400 border border-emerald-800"
          }`}>
            {riskData.level}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* MAIN WORKSPACE */}
      {/* ------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden">
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
              {(activeHazardsCount > 0 || activeEventsCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              )}
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
              <span>🚴 Squad ({riders.length})</span>
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
                rainfall={rainfall}
                traffic={traffic}
                riskData={riskData}
                hazards={hazards}
                events={events}
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
                    membersCount={riders.length}
                    separationStatus={separationStatus}
                    emergencyCorridor={emergencyCorridor}
                    onRequestRegroup={handleRequestRegroup}
                    onToggleEmergency={handleToggleEmergency}
                    onOpenRerouteModal={() => setIsRerouteModalOpen(true)}
                    onEndRide={() => {
                      setActiveRide(null);
                      setAlternativeRoute(null);
                      setRegroupPoint(null);
                      addAlert({
                        type: "info",
                        title: "Ride Concluded",
                        message: "Group ride coordination mode completed."
                      });
                    }}
                  />
                )}

                <RiderList
                  riders={riders}
                  currentUserId="user-leader"
                />
              </>
            )}

            {/* TAB 3: SIMULATION CONTROLS & SUITE */}
            {activeSidebarTab === "SIMULATION" && (
              <SimulationControlsPanel
                mode={controlMode}
                onToggleMode={(m) => setControlMode(m)}
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
              />
            )}
          </div>
        </aside>

        {/* CENTER / MAIN: Real Leaflet Map View */}
        <main className="flex-1 relative h-full bg-slate-950 p-4">
          <NotificationBanner
            alerts={alerts}
            onDismiss={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
          />

          <GroupMapView
            userLocation={userLocation}
            riders={riders}
            plannedRoute={plannedRoute}
            alternativeRoute={alternativeRoute}
            emergencyCorridor={emergencyCorridor}
            hazards={hazards}
            events={events}
            reports={reports}
            regroupPoint={regroupPoint}
            focusLocation={focusLocation}
          />
        </main>
      </div>

      {/* MODALS */}
      <CreateRideModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRideCreated={(ride, members, routeData) => {
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
            message: `Created "${ride.name}" with code ${ride.code}.`
          });
        }}
      />

      <JoinRideModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onRideJoined={(ride, members) => {
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
