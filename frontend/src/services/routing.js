/**
 * Open-Source Map styling and default preset locations for Bengaluru
 * 100% Free & Open-Source (OpenFreeMap & OpenStreetMap) - ZERO API Key Required
 */

export const BENGALURU_CENTER = [77.5946, 12.9716]; // [lng, lat]

export const PRESET_LOCATIONS = [
  {
    id: "koramangala",
    name: "Koramangala (Sony World Signal)",
    coordinates: [77.6245, 12.9352]
  },
  {
    id: "indiranagar",
    name: "Indiranagar (100 Feet Road)",
    coordinates: [77.6412, 12.9784]
  },
  {
    id: "electronic_city",
    name: "Electronic City Tollgate",
    coordinates: [77.6680, 12.8452]
  },
  {
    id: "whitefield",
    name: "Whitefield (ITPL)",
    coordinates: [77.7499, 12.9863]
  }
];

// 100% Open-Source Map Styles (NO API KEY required)
export const OPEN_SOURCE_MAP_STYLES = {
  openfreemap_dark: {
    id: "openfreemap_dark",
    name: "OpenFreeMap Dark (Vector)",
    styleUrl: "https://tiles.openfreemap.org/styles/dark",
    badge: "100% Open Source (No Key)"
  },
  osm_hot: {
    id: "osm_hot",
    name: "OSM Humanitarian (Raster)",
    styleObj: {
      version: 8,
      sources: {
        "osm-hot-tiles": {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, Humanitarian OpenStreetMap Team"
        }
      },
      layers: [
        {
          id: "osm-hot-layer",
          type: "raster",
          source: "osm-hot-tiles",
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    badge: "OpenStreetMap France (No Key)"
  },
  carto_dark: {
    id: "carto_dark",
    name: "Carto Dark Matter (Raster)",
    styleObj: {
      version: 8,
      sources: {
        "carto-dark-tiles": {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, © CARTO"
        }
      },
      layers: [
        {
          id: "carto-dark-layer",
          type: "raster",
          source: "carto-dark-tiles",
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    badge: "Carto Open Basemap (No Key)"
  }
};

export const MAP_THEME = {
  // Default open source style
  defaultStyle: "https://tiles.openfreemap.org/styles/dark",

  // Route colors
  normalRouteColor: "#94a3b8", // subtle slate
  affectedRouteColor: "#ef4444", // red when hazardous
  safeRouteColor: "#10b981", // bright emerald green
  alternateRouteColor: "#06b6d4", // vivid cyan

  // Hazard colors
  highRiskColor: "#f97316", // orange
  criticalRiskColor: "#ef4444", // red
  safeZoneColor: "#10b981", // green

  // Line widths
  routeLineWidth: 6,
  routeCasingWidth: 9
};
