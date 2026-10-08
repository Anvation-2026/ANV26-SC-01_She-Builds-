import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { MAP_THEME, BENGALURU_CENTER, OPEN_SOURCE_MAP_STYLES } from "../services/routing";
import { Layers, CheckCircle2, Globe } from "lucide-react";

export default function MapView({
  startCoord,
  destCoord,
  normalRoute,
  safeRoute,
  isHazardDetected,
  hazards = [],
  reports = [],
  onSelectHazard
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [currentStyleKey, setCurrentStyleKey] = useState("openfreemap_dark");

  const setupRouteLayers = useCallback((map) => {
    if (!map) return;

    if (!map.getSource("normal-route")) {
      map.addSource("normal-route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "normal-route-casing",
        type: "line",
        source: "normal-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#020617",
          "line-width": MAP_THEME.routeCasingWidth,
          "line-opacity": 0.8
        }
      });

      map.addLayer({
        id: "normal-route-line",
        type: "line",
        source: "normal-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": MAP_THEME.normalRouteColor,
          "line-width": MAP_THEME.routeLineWidth,
          "line-opacity": 0.9
        }
      });
    }

    if (!map.getSource("safe-route")) {
      map.addSource("safe-route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "safe-route-casing",
        type: "line",
        source: "safe-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#064e3b",
          "line-width": MAP_THEME.routeCasingWidth + 2,
          "line-opacity": 0.7
        }
      });

      map.addLayer({
        id: "safe-route-line",
        type: "line",
        source: "safe-route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": MAP_THEME.safeRouteColor,
          "line-width": MAP_THEME.routeLineWidth + 1,
          "line-opacity": 0.95
        }
      });
    }
  }, []);

  // Update Route GeoJSON helper
  const updateRouteData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getSource("normal-route")) {
      const normalFeatures = normalRoute ? [normalRoute] : [];
      map.getSource("normal-route").setData({
        type: "FeatureCollection",
        features: normalFeatures
      });

      if (isHazardDetected) {
        map.setPaintProperty("normal-route-line", "line-color", MAP_THEME.affectedRouteColor);
        map.setPaintProperty("normal-route-line", "line-dasharray", [2, 2]);
        map.setPaintProperty("normal-route-line", "line-opacity", 0.6);
      } else {
        map.setPaintProperty("normal-route-line", "line-color", MAP_THEME.safeRouteColor);
        map.setPaintProperty("normal-route-line", "line-dasharray", [1, 0]);
        map.setPaintProperty("normal-route-line", "line-opacity", 0.9);
      }
    }

    if (map.getSource("safe-route")) {
      const safeFeatures = isHazardDetected && safeRoute ? [safeRoute] : [];
      map.getSource("safe-route").setData({
        type: "FeatureCollection",
        features: safeFeatures
      });
    }
  }, [normalRoute, safeRoute, isHazardDetected]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initialStyleDef = OPEN_SOURCE_MAP_STYLES[currentStyleKey];
    const mapStyle = initialStyleDef.styleUrl || initialStyleDef.styleObj;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: BENGALURU_CENTER,
      zoom: 12.8,
      pitch: 30,
      antialias: true
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("load", () => {
      setupRouteLayers(map);
      updateRouteData();
    });

    map.on("style.load", () => {
      setupRouteLayers(map);
      updateRouteData();
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Handle Style Switching
  const handleStyleChange = (styleKey) => {
    setCurrentStyleKey(styleKey);
    const map = mapRef.current;
    if (!map) return;

    const styleDef = OPEN_SOURCE_MAP_STYLES[styleKey];
    const newStyle = styleDef.styleUrl || styleDef.styleObj;

    map.setStyle(newStyle);
    map.once("style.load", () => {
      setupRouteLayers(map);
      updateRouteData();
    });
  };

  // Sync route data when normalRoute/safeRoute changes
  useEffect(() => {
    updateRouteData();
  }, [normalRoute, safeRoute, isHazardDetected, updateRouteData]);

  // Update Markers (Start, Dest, Hazards, Reports)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Start Marker
    if (startCoord) {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center cursor-pointer";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold animate-bounce">
            A
          </div>
          <div class="absolute -bottom-1 w-2 h-2 bg-emerald-700 rotate-45"></div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(startCoord)
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div class="font-bold text-emerald-400 text-sm">📍 Start Point</div><div class="text-xs text-slate-300">Central Bengaluru (Cubbon Park)</div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    }

    // 2. Destination Marker
    if (destCoord) {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center cursor-pointer";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-violet-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold">
            B
          </div>
          <div class="absolute -bottom-1 w-2 h-2 bg-violet-800 rotate-45"></div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(destCoord)
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div class="font-bold text-violet-400 text-sm">🎯 Destination</div><div class="text-xs text-slate-300">Koramangala (Sony World Signal)</div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    }

    // 3. Active Hazards Markers & Click Popups
    hazards.forEach(hazard => {
      if (!hazard.active) return;

      const isCritical = hazard.severity > 80 || hazard.blocked;
      const markerColorClass = isCritical ? "bg-red-500 shadow-red-500/50" : "bg-orange-500 shadow-orange-500/50";
      const pulseClass = isCritical ? "hazard-pulse-red bg-red-500/40" : "hazard-pulse-orange bg-orange-500/40";
      const icon = hazard.type === "FLOODING" ? "🌊" : hazard.type === "ROAD_CLOSURE" ? "🚧" : "⚠️";

      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center cursor-pointer";
      el.innerHTML = `
        <div class="absolute w-10 h-10 rounded-full ${pulseClass}"></div>
        <div class="relative w-8 h-8 rounded-full ${markerColorClass} border border-white text-base flex items-center justify-center shadow-lg transition-transform hover:scale-125">
          ${icon}
        </div>
      `;

      el.addEventListener("click", () => {
        if (onSelectHazard) onSelectHazard(hazard);
      });

      const popupHtml = `
        <div class="p-1 space-y-1.5 min-w-[210px]">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-xs font-bold tracking-wider uppercase text-slate-400">Hazard Report</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${isCritical ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-orange-950 text-orange-400 border border-orange-800'}">
              ${hazard.severity}% RISK
            </span>
          </div>
          <div class="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <span>${icon}</span>
            <span>${hazard.name}</span>
          </div>
          <div class="text-xs space-y-1 text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
            <div><strong class="text-slate-400">Type:</strong> <span class="text-amber-300 font-medium">${hazard.type.replace('_', ' ')}</span></div>
            <div><strong class="text-slate-400">Status:</strong> <span class="${hazard.blocked ? 'text-red-400 font-bold' : 'text-orange-400'}">${hazard.blocked ? 'ROAD BLOCKED' : 'HIGH RISK PASSABLE'}</span></div>
            <div><strong class="text-slate-400">Confidence:</strong> <span class="text-emerald-400 font-medium">${hazard.confidence || 92}%</span></div>
            <div class="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">"${hazard.description}"</div>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([hazard.longitude, hazard.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(popupHtml))
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 4. Crowdsourced User Reports
    reports.forEach(report => {
      const el = document.createElement("div");
      el.className = "cursor-pointer flex items-center justify-center";
      el.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-cyan-600 border border-white text-xs flex items-center justify-center text-white shadow-md hover:scale-110">
          📢
        </div>
      `;

      const popupHtml = `
        <div class="p-1 space-y-1 min-w-[180px]">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-[10px] font-bold text-cyan-400">CITIZEN DISPATCH</span>
            <span class="text-[10px] text-slate-400">${report.id}</span>
          </div>
          <div class="text-xs font-semibold text-slate-200">${report.type.replace('_', ' ')}</div>
          <div class="text-xs text-slate-300 italic">"${report.description}"</div>
          <div class="text-[10px] text-emerald-400 pt-1">Trust Score: ${report.trustScore}% Verified</div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(popupHtml))
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [hazards, reports, startCoord, destCoord, onSelectHazard]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80" />
      
      {/* Open Source Map API Badge & Layer Selector */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {/* Open Source Provider Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Open-Source Map API (No Key Required)</span>
        </div>

        {/* Style Switcher Dropdown */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2 py-1 rounded-xl shadow-lg flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={currentStyleKey}
            onChange={(e) => handleStyleChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            {Object.entries(OPEN_SOURCE_MAP_STYLES).map(([key, item]) => (
              <option key={key} value={key} className="bg-slate-900 text-slate-200">
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-medium">Safer Route</span>
        </div>
        {isHazardDetected && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-red-500 border-dashed border"></span>
            <span className="text-slate-400">Compromised Corridor</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-300">Blocked Road</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span className="text-slate-300">High Risk Zone</span>
        </div>
      </div>
    </div>
  );
}
