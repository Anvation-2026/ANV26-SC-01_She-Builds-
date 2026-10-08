/**
 * Road network definitions for Bengaluru demo corridor
 * Coordinates in [longitude, latitude] format for GeoJSON compatibility
 */

export const initialRoads = [
  {
    id: "road-1",
    name: "Hosur Road - Richmond Underpass",
    type: "primary_arterial",
    historicalRisk: 80,
    blocked: false,
    floodRisk: 15,
    trafficLevel: 30,
    coordinates: [
      [77.5946, 12.9716],
      [77.5975, 12.9610],
      [77.6010, 12.9515],
      [77.6080, 12.9420],
      [77.6245, 12.9352]
    ]
  },
  {
    id: "road-2",
    name: "Shanti Nagar - Double Road Bypass",
    type: "secondary_arterial",
    historicalRisk: 65,
    blocked: false,
    floodRisk: 20,
    trafficLevel: 40,
    coordinates: [
      [77.5946, 12.9716],
      [77.5890, 12.9620],
      [77.5950, 12.9530],
      [77.6110, 12.9400],
      [77.6245, 12.9352]
    ]
  },
  {
    id: "road-3",
    name: "Brigade Road - Public Event Corridor",
    type: "commercial_arterial",
    historicalRisk: 45,
    blocked: false,
    floodRisk: 10,
    trafficLevel: 45,
    coordinates: [
      [77.5946, 12.9716],
      [77.6070, 12.9670],
      [77.6150, 12.9560],
      [77.6200, 12.9450],
      [77.6245, 12.9352]
    ]
  },
  {
    id: "road-4",
    name: "Inner Ring Road Elevated Corridor",
    type: "resilient_bypass",
    historicalRisk: 20,
    blocked: false,
    floodRisk: 5,
    trafficLevel: 25,
    coordinates: [
      [77.5946, 12.9716],
      [77.6120, 12.9750],
      [77.6320, 12.9620],
      [77.6340, 12.9470],
      [77.6245, 12.9352]
    ]
  }
];
