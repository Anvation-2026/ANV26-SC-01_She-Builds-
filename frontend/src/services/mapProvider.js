/**
 * Map Provider Abstraction
 * Allows configurable tile providers via environment variable VITE_MAP_TILE_URL
 */

export const DEFAULT_TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_PROVIDERS = {
  carto_dark: {
    id: "carto_dark",
    name: "Carto Dark Matter (OSM)",
    url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    attribution: "© OpenStreetMap contributors, © CARTO"
  },
  osm_standard: {
    id: "osm_standard",
    name: "OpenStreetMap Standard",
    url: DEFAULT_TILE_URL,
    attribution: "© OpenStreetMap contributors"
  },
  osm_humanitarian: {
    id: "osm_humanitarian",
    name: "Humanitarian OSM",
    url: "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, Humanitarian OpenStreetMap Team"
  }
};
