import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_PROVIDERS } from "../../services/mapProvider";
import { Layers, Shield, Eye, EyeOff } from "lucide-react";

// Fix Leaflet's default icon URLs if ever used by fallback
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function GroupMapView({
  userLocation,
  riders = [],
  plannedRoute,
  alternativeRoute,
  emergencyCorridor = false,
  hazards = [],
  events = [],
  reports = [],
  regroupPoint = null,
  focusLocation = null
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const layersGroup = useRef({
    route: null,
    alternative: null,
    riders: null,
    hazards: null,
    events: null,
    regroup: null,
    reports: null
  });

  const [activeProvider, setActiveProvider] = useState("carto_dark");
  const [visibleLayers, setVisibleLayers] = useState({
    routes: true,
    riders: true,
    hazards: true,
    events: true,
    reports: true
  });

  // Initialize Leaflet Map safely
  useEffect(() => {
    if (!mapContainer.current) return;

    // Prevent "Map container is already initialized" error
    if (mapContainer.current._leaflet_id) {
      delete mapContainer.current._leaflet_id;
    }
    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (e) {
        // ignore
      }
      mapInstance.current = null;
    }

    try {
      const map = L.map(mapContainer.current, {
        center: [12.9716, 77.5946], // Bengaluru center
        zoom: 13,
        zoomControl: false
      });

      L.control.zoom({ position: "bottom-right" }).addTo(map);

      // Tile layer
      const provider = MAP_PROVIDERS[activeProvider] || MAP_PROVIDERS.carto_dark;
      tileLayerRef.current = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: 19
      }).addTo(map);

      // Feature groups
      layersGroup.current.route = L.featureGroup().addTo(map);
      layersGroup.current.alternative = L.featureGroup().addTo(map);
      layersGroup.current.hazards = L.featureGroup().addTo(map);
      layersGroup.current.events = L.featureGroup().addTo(map);
      layersGroup.current.reports = L.featureGroup().addTo(map);
      layersGroup.current.riders = L.featureGroup().addTo(map);
      layersGroup.current.regroup = L.featureGroup().addTo(map);

      mapInstance.current = map;

      // Invalidate size to ensure container dimensions are recognized immediately
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 150);
    } catch (err) {
      console.error("[Map Init Error]:", err);
    }

    const handleResize = () => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    let resizeObserver = null;
    if (mapContainer.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstance.current = null;
      }
      if (mapContainer.current) {
        delete mapContainer.current._leaflet_id;
      }
    };
  }, []);

  // Update Tile Layer
  const handleProviderChange = (providerId) => {
    setActiveProvider(providerId);
    if (!mapInstance.current || !tileLayerRef.current) return;

    try {
      const provider = MAP_PROVIDERS[providerId] || MAP_PROVIDERS.carto_dark;
      mapInstance.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: 19
      }).addTo(mapInstance.current);
    } catch (e) {
      console.warn("Tile switch error:", e);
    }
  };

  // Handle Dynamic Focus on Location
  useEffect(() => {
    if (focusLocation && focusLocation.lat && focusLocation.lng && mapInstance.current) {
      mapInstance.current.flyTo(
        [focusLocation.lat, focusLocation.lng],
        focusLocation.zoom || 15,
        { duration: 1.2 }
      );
    }
  }, [focusLocation]);

  // Toggle Layer Visibility
  const toggleLayer = (layerKey) => {
    setVisibleLayers((prev) => {
      const updated = { ...prev, [layerKey]: !prev[layerKey] };
      const map = mapInstance.current;
      if (!map) return updated;

      if (layerKey === "hazards" && layersGroup.current.hazards) {
        if (updated.hazards) map.addLayer(layersGroup.current.hazards);
        else map.removeLayer(layersGroup.current.hazards);
      }
      if (layerKey === "events" && layersGroup.current.events) {
        if (updated.events) map.addLayer(layersGroup.current.events);
        else map.removeLayer(layersGroup.current.events);
      }
      if (layerKey === "reports" && layersGroup.current.reports) {
        if (updated.reports) map.addLayer(layersGroup.current.reports);
        else map.removeLayer(layersGroup.current.reports);
      }
      if (layerKey === "riders" && layersGroup.current.riders) {
        if (updated.riders) map.addLayer(layersGroup.current.riders);
        else map.removeLayer(layersGroup.current.riders);
      }
      if (layerKey === "routes") {
        if (layersGroup.current.route) {
          if (updated.routes) map.addLayer(layersGroup.current.route);
          else map.removeLayer(layersGroup.current.route);
        }
        if (layersGroup.current.alternative) {
          if (updated.routes) map.addLayer(layersGroup.current.alternative);
          else map.removeLayer(layersGroup.current.alternative);
        }
      }
      return updated;
    });
  };

  // Render Routes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.route) return;

    try {
      layersGroup.current.route.clearLayers();
      layersGroup.current.alternative.clearLayers();

      // Planned Route
      if (plannedRoute?.geometry?.coordinates) {
        const latLngs = plannedRoute.geometry.coordinates.map(c => [c[1], c[0]]);

        // Outer Casing
        L.polyline(latLngs, {
          color: emergencyCorridor ? "#f59e0b" : "#022c22",
          weight: emergencyCorridor ? 11 : 8,
          opacity: emergencyCorridor ? 0.9 : 0.7,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(layersGroup.current.route);

        // Inner Line
        L.polyline(latLngs, {
          color: emergencyCorridor ? "#fbbf24" : "#10b981",
          weight: emergencyCorridor ? 6 : 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(layersGroup.current.route);
      }

      // Alternative Detour Route
      if (alternativeRoute?.geometry?.coordinates) {
        const altLatLngs = alternativeRoute.geometry.coordinates.map(c => [c[1], c[0]]);
        L.polyline(altLatLngs, {
          color: alternativeRoute.color || "#06b6d4",
          weight: 5,
          dashArray: "6, 8",
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(layersGroup.current.alternative);
      }
    } catch (err) {
      console.warn("[Route Render Warning]:", err);
    }
  }, [plannedRoute, alternativeRoute, emergencyCorridor]);

  // Render Riders & User Marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.riders) return;

    try {
      layersGroup.current.riders.clearLayers();

      // Render User if GPS available
      if (userLocation?.lat && userLocation?.lng) {
        const userHtml = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-ping"></div>
            <div class="relative w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold">
              YOU
            </div>
          </div>
        `;
        const userIcon = L.divIcon({ html: userHtml, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .bindPopup(`<div class="text-xs font-bold text-emerald-400">📍 You (Live GPS)</div><div class="text-[11px] text-slate-300">Speed: ${userLocation.speed || 0} km/h • ±${userLocation.accuracy || 5}m</div>`)
          .addTo(layersGroup.current.riders);
      }

      // Render Group Riders safely
      if (Array.isArray(riders)) {
        riders.forEach(item => {
          if (!item) return;
          const r = item.rider || item;
          const loc = item.location || r.lastLocation;
          if (!loc || !loc.lat || !loc.lng) return;

          const isLeader = r.role === "LEADER";
          const isOffRoute = Boolean(r.isOffRoute || r.offRouteState?.isOffRoute);
          const isStopped = Boolean(r.isStopped);

          const userId = r.userId || item.userId || "";
          const name = r.name || item.name || "Rider";
          const displayName = name.split(" ")[0];

          const bgColor = isOffRoute
            ? "bg-red-500"
            : isLeader
            ? "bg-amber-500"
            : userId === "user-rahul"
            ? "bg-blue-500"
            : userId === "user-akash"
            ? "bg-purple-500"
            : userId === "user-vivek"
            ? "bg-orange-500"
            : "bg-teal-500";

          const badgeInitial = isLeader ? "⭐" : r.avatar || name.charAt(0);

          const markerHtml = `
            <div class="relative flex flex-col items-center cursor-pointer group">
              ${isOffRoute ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white animate-bounce"></div>' : ''}
              <div class="w-7 h-7 rounded-full ${bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transform hover:scale-125 transition">
                ${badgeInitial}
              </div>
              <div class="mt-0.5 px-1.5 py-0.2 bg-slate-900/90 text-[9px] font-semibold text-slate-200 rounded border border-slate-700 whitespace-nowrap shadow">
                ${displayName}
              </div>
            </div>
          `;

          const riderIcon = L.divIcon({
            html: markerHtml,
            className: "",
            iconSize: [28, 42],
            iconAnchor: [14, 21]
          });

          const relDistance = item.analysis?.relativeDistances?.["user-leader"]?.relativeLabel || "";
          const offRouteInfo = isOffRoute ? `<div class="text-red-400 font-bold">⚠️ OFF ROUTE (${r.offRouteState?.distance || 420}m)</div>` : '';

          const popupHtml = `
            <div class="p-1 space-y-1 min-w-[170px] text-xs">
              <div class="font-bold text-slate-100 flex items-center justify-between border-b border-slate-700 pb-1">
                <span>${name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${r.role || 'RIDER'}</span>
              </div>
              ${offRouteInfo}
              <div class="text-slate-300 text-[11px]">Speed: <strong class="text-slate-100">${loc.speed || 0} km/h</strong></div>
              ${relDistance ? `<div class="text-emerald-400 text-[11px]">Relative: ${relDistance}</div>` : ''}
              <div class="text-slate-400 text-[10px]">Status: ${isStopped ? "Stopped" : "En Route"}</div>
            </div>
          `;

          L.marker([loc.lat, loc.lng], { icon: riderIcon })
            .bindPopup(popupHtml)
            .addTo(layersGroup.current.riders);
        });
      }
    } catch (err) {
      console.warn("[Riders Render Warning]:", err);
    }
  }, [riders, userLocation]);

  // Render Floods & Waterlogging Hazards
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.hazards) return;

    try {
      layersGroup.current.hazards.clearLayers();

      if (Array.isArray(hazards)) {
        hazards.forEach(h => {
          if (!h || !h.active) return;

          const isCritical = h.severity > 80 || h.blocked;
          const color = isCritical ? "#ef4444" : "#f97316";

          // Pulsing Area Circle
          L.circle([h.latitude, h.longitude], {
            radius: h.radiusMeters || 500,
            color: color,
            fillColor: color,
            fillOpacity: 0.28,
            weight: 2
          }).addTo(layersGroup.current.hazards);

          // Icon Marker
          const iconChar = h.type === "FLOODING" ? "🌊" : h.type === "ROAD_CLOSURE" ? "🚧" : "⚠️";
          const iconHtml = `
            <div class="w-8 h-8 rounded-full ${isCritical ? 'bg-red-600' : 'bg-orange-500'} border-2 border-white shadow-xl flex items-center justify-center text-sm cursor-pointer hover:scale-125 transition">
              ${iconChar}
            </div>
          `;
          const hazardIcon = L.divIcon({ html: iconHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 16] });

          const popupHtml = `
            <div class="p-1 space-y-1.5 min-w-[210px] text-xs">
              <div class="font-bold text-slate-100 border-b border-slate-700 pb-1 flex items-center justify-between">
                <span>${h.name}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isCritical ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-orange-950 text-orange-400 border border-orange-800'}">
                  ${h.severity}% Risk
                </span>
              </div>
              <div class="bg-slate-900 p-1.5 rounded border border-slate-800 text-[11px] font-mono">
                <span class="text-cyan-300 font-bold block">🌊 Water Depth: ${h.waterDepth || "3.5 ft"}</span>
                <span class="${h.blocked ? 'text-red-400 font-bold' : 'text-amber-400'} block">
                  Status: ${h.roadStatus || (h.blocked ? 'ROAD BLOCKED' : 'HAZARDOUS')}
                </span>
              </div>
              <div class="text-[11px] text-slate-300"><strong>Corridor:</strong> ${h.corridor || 'Central'}</div>
              <div class="text-[11px] text-slate-300"><strong>Confidence:</strong> ${h.confidence}% Verified</div>
              <div class="text-[10px] text-slate-400 italic pt-0.5">"${h.description}"</div>
            </div>
          `;

          L.marker([h.latitude, h.longitude], { icon: hazardIcon })
            .bindPopup(popupHtml)
            .addTo(layersGroup.current.hazards);
        });
      }
    } catch (err) {
      console.warn("[Hazards Render Warning]:", err);
    }
  }, [hazards]);

  // Render Protests, Strikes & Civil Assemblies
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.events) return;

    try {
      layersGroup.current.events.clearLayers();

      if (Array.isArray(events)) {
        events.forEach(ev => {
          if (!ev || ev.status !== "ACTIVE") return;

          const isStrike = ev.type === "STRIKE";
          const isFestival = ev.type === "FESTIVAL";
          const color = isStrike ? "#dc2626" : isFestival ? "#9333ea" : "#ea580c";

          // Pulsing Area Circle
          L.circle([ev.latitude, ev.longitude], {
            radius: 650,
            color: color,
            fillColor: color,
            fillOpacity: 0.22,
            weight: 2
          }).addTo(layersGroup.current.events);

          // Icon Marker
          const iconChar = isStrike ? "📢" : isFestival ? "🎪" : "✊";
          const bgColor = isStrike ? "bg-red-600" : isFestival ? "bg-purple-600" : "bg-orange-500";

          const iconHtml = `
            <div class="relative flex flex-col items-center cursor-pointer group">
              <div class="w-8 h-8 rounded-full ${bgColor} border-2 border-white shadow-xl flex items-center justify-center text-sm hover:scale-125 transition">
                ${iconChar}
              </div>
              <div class="mt-0.5 px-1 py-0.2 bg-slate-900 text-[8px] font-mono font-bold text-white rounded border border-slate-700 whitespace-nowrap shadow">
                ${ev.type}
              </div>
            </div>
          `;

          const eventIcon = L.divIcon({ html: iconHtml, className: "", iconSize: [32, 42], iconAnchor: [16, 21] });

          const popupHtml = `
            <div class="p-1 space-y-1.5 min-w-[210px] text-xs">
              <div class="font-bold text-slate-100 border-b border-slate-700 pb-1 flex items-center justify-between">
                <span>${ev.name}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isStrike ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-purple-950 text-purple-400 border border-purple-800'}">
                  ${ev.type}
                </span>
              </div>
              <div class="bg-slate-900 p-1.5 rounded border border-slate-800 text-[11px] font-mono space-y-0.5">
                <div class="text-slate-300">👥 Attendees: <strong>${ev.expectedAttendance ? ev.expectedAttendance.toLocaleString() : 15000}</strong></div>
                <div class="text-amber-400 font-bold">⛔ Capacity Choke: -${(ev.roadCapacityReduction * 100) || 50}%</div>
                ${ev.policeDiversion ? '<div class="text-emerald-400 font-bold">👮 Police Diversions Enforced</div>' : ''}
              </div>
              <div class="text-[11px] text-slate-300"><strong>Corridor:</strong> ${ev.affectedCorridor}</div>
              <div class="text-[10px] text-slate-400 italic pt-0.5">"${ev.description}"</div>
            </div>
          `;

          L.marker([ev.latitude, ev.longitude], { icon: eventIcon })
            .bindPopup(popupHtml)
            .addTo(layersGroup.current.events);
        });
      }
    } catch (err) {
      console.warn("[Events Render Warning]:", err);
    }
  }, [events]);

  // Render Regroup Point
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.regroup) return;

    try {
      layersGroup.current.regroup.clearLayers();

      if (regroupPoint && regroupPoint.lat && regroupPoint.lng) {
        const regroupHtml = `
          <div class="relative flex flex-col items-center cursor-pointer animate-bounce">
            <div class="w-9 h-9 rounded-full bg-violet-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-base font-bold">
              🏁
            </div>
            <div class="px-2 py-0.5 bg-violet-950 text-[10px] font-bold text-violet-300 rounded border border-violet-700 whitespace-nowrap shadow mt-0.5">
              REGROUP POINT
            </div>
          </div>
        `;
        const regroupIcon = L.divIcon({ html: regroupHtml, className: "", iconSize: [36, 48], iconAnchor: [18, 24] });

        const popup = `
          <div class="p-1 text-xs">
            <div class="font-bold text-violet-400 text-sm">🏁 Recommended Regroup Point</div>
            <div class="font-semibold text-slate-200 mt-1">${regroupPoint.name}</div>
            <div class="text-slate-300 text-[11px] mt-0.5">${regroupPoint.convergenceMessage || ''}</div>
            <div class="text-slate-400 text-[10px] mt-0.5">Furthest rider: ${regroupPoint.distanceFormatted || ''}</div>
          </div>
        `;

        L.marker([regroupPoint.lat, regroupPoint.lng], { icon: regroupIcon })
          .bindPopup(popup)
          .openPopup()
          .addTo(layersGroup.current.regroup);

        map.panTo([regroupPoint.lat, regroupPoint.lng]);
      }
    } catch (err) {
      console.warn("[Regroup Render Warning]:", err);
    }
  }, [regroupPoint]);

  // Render Crowdsourced Hazard Reports
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersGroup.current.reports) return;

    try {
      layersGroup.current.reports.clearLayers();

      if (Array.isArray(reports)) {
        reports.forEach((rep) => {
          if (!rep || !rep.latitude || !rep.longitude) return;

          const iconChar =
            rep.type === "FLOODING"
              ? "🌊"
              : rep.type === "ROAD_BLOCKED"
              ? "🚧"
              : rep.type === "ACCIDENT"
              ? "💥"
              : rep.type === "WATERLOGGING"
              ? "💧"
              : rep.type === "EMERGENCY"
              ? "🚨"
              : "📢";

          const markerHtml = `
            <div class="relative flex flex-col items-center cursor-pointer group">
              <div class="w-7 h-7 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-xs hover:scale-125 transition">
                ${iconChar}
              </div>
              <div class="mt-0.5 px-1 py-0.2 bg-slate-900 text-[8px] font-mono font-bold text-cyan-300 rounded border border-cyan-800 whitespace-nowrap shadow">
                REPORT
              </div>
            </div>
          `;

          const reportIcon = L.divIcon({
            html: markerHtml,
            className: "",
            iconSize: [28, 38],
            iconAnchor: [14, 19]
          });

          const popupHtml = `
            <div class="p-1 space-y-1.5 min-w-[200px] text-xs">
              <div class="font-bold text-slate-100 border-b border-slate-700 pb-1 flex items-center justify-between">
                <span class="text-cyan-300 font-mono">📢 Citizen Report (${rep.id})</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  ${rep.trustScore || 85}% Trust
                </span>
              </div>
              <div class="text-slate-200 font-semibold">${rep.type ? rep.type.replace('_', ' ') : 'HAZARD'}</div>
              <div class="text-[11px] text-slate-300 italic">"${rep.description}"</div>
              <div class="text-[10px] text-emerald-400 font-mono">
                ${rep.gpsVerified ? "✓ Verified GPS Coordinate" : "Community Submitted"}
              </div>
            </div>
          `;

          L.marker([rep.latitude, rep.longitude], { icon: reportIcon })
            .bindPopup(popupHtml)
            .addTo(layersGroup.current.reports);
        });
      }
    } catch (err) {
      console.warn("[Reports Render Warning]:", err);
    }
  }, [reports]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
      />

      {/* Top Map Controls: Layer Toggles & Provider Switcher */}
      <div className="absolute top-4 right-4 z-[500] flex flex-wrap items-center gap-2">
        {emergencyCorridor && (
          <div className="bg-amber-500/90 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xl animate-pulse">
            <Shield className="w-4 h-4" />
            <span>EMERGENCY CORRIDOR</span>
          </div>
        )}

        {/* Quick Layer Visibility Pills */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => toggleLayer("hazards")}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1 ${
              visibleLayers.hazards ? "bg-red-950 text-red-300 border border-red-800" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            🌊 Floods
          </button>
          <button
            onClick={() => toggleLayer("events")}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1 ${
              visibleLayers.events ? "bg-purple-950 text-purple-300 border border-purple-800" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            📢 Strikes
          </button>
          <button
            onClick={() => toggleLayer("riders")}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1 ${
              visibleLayers.riders ? "bg-blue-950 text-blue-300 border border-blue-800" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            🚴 Riders
          </button>
          <button
            onClick={() => toggleLayer("reports")}
            className={`px-2 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1 ${
              visibleLayers.reports ? "bg-cyan-950 text-cyan-300 border border-cyan-800" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            📝 Reports
          </button>
        </div>

        {/* Tile Provider Select */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={activeProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1 font-medium"
          >
            {Object.entries(MAP_PROVIDERS).map(([key, item]) => (
              <option key={key} value={key} className="bg-slate-900 text-slate-200">
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Map Legend */}
      <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl shadow-xl flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-medium">Safe Route</span>
        </div>
        {alternativeRoute && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-cyan-400 border border-dashed"></span>
            <span className="text-cyan-300 font-medium">{alternativeRoute.label || 'Detour'}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Leader (⭐)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-slate-300">Riders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-300">🌊 Floods</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span className="text-slate-300">📢 Strikes/Protests</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
          <span className="text-slate-300">📝 Reports</span>
        </div>
      </div>
    </div>
  );
}
