/**
 * Comprehensive Hazard Zones for Bengaluru Urban Mobility Corridors
 * Covers Koramangala, Indiranagar, Electronic City, and Whitefield
 */

export const initialHazards = [
  // --- KORAMANGALA CORRIDOR ---
  {
    id: "HZ-001",
    name: "Richmond Circle / Hosur Underpass",
    corridor: "koramangala",
    type: "FLOODING",
    severity: 95,
    confidence: 94,
    blocked: true,
    latitude: 12.9560,
    longitude: 77.5990,
    description: "Severe waterlogging 3.5 ft deep. Multiple vehicles stalled.",
    radiusMeters: 650,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-002",
    name: "Shanti Nagar Double Road Junction",
    corridor: "koramangala",
    type: "WATERLOGGING",
    severity: 75,
    confidence: 88,
    blocked: false,
    latitude: 12.9510,
    longitude: 77.5940,
    description: "Moderate waterlogging on side lanes. Traffic crawling at 5 km/h.",
    radiusMeters: 550,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-003",
    name: "Adugodi / Koramangala Link Underpass",
    corridor: "koramangala",
    type: "FLOODING",
    severity: 90,
    confidence: 91,
    blocked: true,
    latitude: 12.9430,
    longitude: 77.6110,
    description: "Flash flood overflow from stormwater drain. Submerged road.",
    radiusMeters: 650,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-004",
    name: "Koramangala 80 Feet Road Corridor",
    corridor: "koramangala",
    type: "ROAD_CLOSURE",
    severity: 88,
    confidence: 96,
    blocked: true,
    latitude: 12.9360,
    longitude: 77.6220,
    description: "Large Public Event: Food & Cultural Street Fair. Road closed.",
    radiusMeters: 650,
    active: false,
    timestamp: new Date().toISOString()
  },

  // --- INDIRANAGAR CORRIDOR ---
  {
    id: "HZ-005",
    name: "100 Feet Road / CMH Road Junction",
    corridor: "indiranagar",
    type: "ROAD_CLOSURE",
    severity: 94,
    confidence: 96,
    blocked: true,
    latitude: 12.9770,
    longitude: 77.6385,
    description: "Large Public Event: Open Street Carnival & Procession. Main corridor barricaded.",
    radiusMeters: 750,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-006",
    name: "MG Road / Trinity Circle Event Closure",
    corridor: "indiranagar",
    type: "ROAD_CLOSURE",
    severity: 90,
    confidence: 93,
    blocked: true,
    latitude: 12.9725,
    longitude: 77.6175,
    description: "Large Public Event: Public Gathering & Rally at Trinity Circle.",
    radiusMeters: 750,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-007",
    name: "Halasuru / Old Madras Road Underpass",
    corridor: "indiranagar",
    type: "FLOODING",
    severity: 92,
    confidence: 90,
    blocked: true,
    latitude: 12.9780,
    longitude: 77.6260,
    description: "Severe stormwater drain overflow near Halasuru lake. Underpass submerged.",
    radiusMeters: 650,
    active: false,
    timestamp: new Date().toISOString()
  },

  // --- ELECTRONIC CITY CORRIDOR ---
  {
    id: "HZ-008",
    name: "Silk Board Junction Underpass",
    corridor: "electronic_city",
    type: "FLOODING",
    severity: 96,
    confidence: 96,
    blocked: true,
    latitude: 12.9175,
    longitude: 77.6235,
    description: "Catastrophic waterlogging 4 ft deep at Silk Board. Flyover ramps jammed.",
    radiusMeters: 800,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-009",
    name: "Hosur Road Tollway Maintenance & Marathon",
    corridor: "electronic_city",
    type: "ROAD_CLOSURE",
    severity: 89,
    confidence: 92,
    blocked: true,
    latitude: 12.8950,
    longitude: 77.6350,
    description: "Large Public Event: City Half-Marathon. Main arterial lane closed.",
    radiusMeters: 800,
    active: false,
    timestamp: new Date().toISOString()
  },

  // --- WHITEFIELD CORRIDOR ---
  {
    id: "HZ-010",
    name: "Marathahalli Underpass Flooding",
    corridor: "whitefield",
    type: "FLOODING",
    severity: 94,
    confidence: 93,
    blocked: true,
    latitude: 12.9560,
    longitude: 77.7010,
    description: "Stormwater canal breach. Marathahalli underpass inundated.",
    radiusMeters: 800,
    active: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "HZ-011",
    name: "ITPL Main Road / Whitefield Junction Closure",
    corridor: "whitefield",
    type: "ROAD_CLOSURE",
    severity: 91,
    confidence: 95,
    blocked: true,
    latitude: 12.9860,
    longitude: 77.7400,
    description: "Large Public Event: Technology Park Annual Procession & Exhibition.",
    radiusMeters: 800,
    active: false,
    timestamp: new Date().toISOString()
  }
];
