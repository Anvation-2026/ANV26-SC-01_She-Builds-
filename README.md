# ResilientUrban

> **Geospatial Disaster Intelligence & Group-Rider Coordination Platform**  
> Disaster-aware navigation, multi-rider live telemetry, route corridor deviation detection, automated squad regrouping, and dynamic hazard-avoidance routing for Bengaluru.

---

## 1. Product Capabilities

### A. Disaster Intelligence
- **Dynamic Road Statuses**: Classifies road network segments into `SAFE`, `CONGESTED`, `AT_RISK`, `HAZARDOUS`, `CRITICAL`, and `BLOCKED`.
- **Multi-Factor Risk Engine**: Computes deterministic road risk from rainfall intensity (mm/hr), low-lying elevation vulnerability, traffic congestion density, public gathering crowd density, and verified citizen hazard dispatches.
- **Multi-Option Rerouting**: When a planned route is compromised by flash floods or road closures, provides **FASTEST**, **SAFEST**, and **BALANCED** alternatives with comparative distance, ETA, and hazard exposure.
- **Emergency Priority Corridor**: Allows designating high-resilience clearance corridors for rescue teams and emergency responders.

### B. Group Ride & Rider Coordination
- **Live Rider Tracking**: Real browser GPS (`navigator.geolocation.watchPosition`) with throttled updates (every 3s, >8m delta) over bi-directional **WebSockets (Socket.IO)**.
- **Relative Rider Telemetry**: Calculates exact distance and orientation relative to user or leader (e.g., *"Rahul: 1.2 km ahead • ETA 4m"* vs *"Akash: 800m behind"*).
- **Proximity Notifications**: Configurable proximity milestone alerts (2 km, 1 km, 500m, 200m, arrived) with state-tracked deduplication.
- **Route Corridor Deviation Detection**: Calculates perpendicular distance from planned OSRM polyline:
  - `NORMAL`: < 100m
  - `WARNING`: 100m – 300m
  - `OFF_ROUTE`: > 300m (triggers rider prompt: *[Return to Route]* / *[Intentionally Leave Route]*)
  - `CRITICAL`: > 1 km (triggers squad alert)
- **Group Separation Detection**: Tracks squad dispersion (`GROUPED` < 1km, `SPREAD OUT` 1–3km, `SEPARATED` 3–5km, `CRITICAL` > 5km).
- **Automated Regrouping**: Computes group centroid and recommends the nearest safe road assembly point (safe bays, plazas, transit plazas) with convergence ETA.

---

## 2. Architecture

```
+---------------------------------------------------------------------------------+
|                                CLIENT (Browser)                                 |
|          React 18 + Leaflet (OpenStreetMap) + Tailwind CSS + Socket.IO          |
|                                                                                 |
|   [ Top Bar: Live GPS vs Simulation Mode Toggle | Start/Join Ride | Reports ]   |
|   [ Sidebar: Active Ride Room | Live Squad Roster | Scenarios 1-8 | Hazards ]   |
|   [ Map: Real OSM Roads | Polylines | Rider Markers | Hazard Radii | Regroup ]  |
+---------------------------------------+-----------------------------------------+
                                        |
                 HTTP REST + WebSockets (Socket.IO Room ride:{id})
                                        |
+---------------------------------------v-----------------------------------------+
|                           BACKEND (Node.js + Express)                           |
|                                                                                 |
|   +---------------------+  +---------------------+  +---------------------+     |
|   |   Ride Service      |  |   Routing Service   |  |  Disaster Risk      |     |
|   | - 6-Digit Codes     |  | - OSRM Integration  |  | - Multi-factor Risk |     |
|   | - Member Tracking   |  | - 3-Option Reroutes |  | - Road Statuses     |     |
|   | - Regroup Points    |  | - Corridor Bypass   |  | - Emergency Route   |     |
|   +---------------------+  +---------------------+  +---------------------+     |
|                                                                                 |
|   +---------------------+  +---------------------+  +---------------------+     |
|   |   Geospatial Core   |  |  Simulation Engine  |  |  Socket.IO Layer    |     |
|   | - Haversine/Bearing |  | - 5 Simulated Riders|  | - Room Broadcasts   |     |
|   | - Polyline Distance |  | - Scenarios 1 to 8  |  | - Deviation Alerts  |     |
|   | - Proximity Tracker |  | - Manual Triggers   |  | - Separation Alerts |     |
|   +---------------------+  +---------------------+  +---------------------+     |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |              Spatial Data Store (In-Memory / PostGIS-Ready)             |   |
|   |        Users, Rides, Members, Breadcrumbs, Hazards, Events, Reports     |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------+-----------------------------------------+
                                        |
                         External Open Geospatial APIs
                                        |
                  +---------------------v---------------------+
                  |       Project-OSRM Driving Router         |
                  |       OpenStreetMap / Carto Dark Tiles    |
                  +-------------------------------------------+
```

---

## 3. How to Run Locally

### Prerequisites
- Node.js v18+ or v20+

### Option A: Both Services are Already Running!
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:5000](http://localhost:5000)

---

### Option B: Running from Scratch via Terminal

#### Terminal 1 — Start Backend Server
```powershell
cd d:\SHE_BUILDS\resilient-urban\backend
node src/server.js
# Output: [ResilientUrban] Server & WebSockets running on http://localhost:5000
```

#### Terminal 2 — Start Frontend Dev Server
```powershell
cd d:\SHE_BUILDS\resilient-urban\frontend
npm run dev -- --host --port 3000
# Output: VITE ready at http://localhost:3000/
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. How to Test All Features (Demo Walkthrough)

### 1. Group Ride Coordination & Live Roster
- The app opens with an active squad ride: **"Bengaluru Urban Express"** (Code: `782914`).
- In the left sidebar under **Rider Roster (5)**, observe:
  - **Vikram (Leader ⭐)**: Leading the squad.
  - **Rahul (🔵)**, **Akash (🟣)**, **Vivek (🟠)**, and **Arjun (Sweeper 🟢)**.
  - Real-time relative distances: e.g. *"220 m ahead • ETA 1m"* or *"480 m behind"*.
- Markers move smoothly along actual OpenStreetMap road vectors in Bengaluru.

### 2. Simulation Scenarios 1 to 8
In the left sidebar under **Control Mode (SIMULATION)**:
1. Click **Play (▶️)** to watch the squad travel along the route in real-time. Change speed between **1x, 2x, 5x, 10x**.
2. **Scenario 2 (Rider Falls Behind)**:
   - Select Scenario 2 or click `[Akash Lag]`.
   - Akash drops speed; once separation exceeds 1 km, the squad status changes to **SPREAD OUT**, and an orange alert appears.
3. **Scenario 3 (Rider Goes Off Route)**:
   - Select Scenario 3 or click `[Rahul Off Route]`.
   - Rahul veers 450m away from the road. The banner sounds:  
     `⚠️ Route Deviation Alert: Rahul is off the planned route corridor by 420m.`  
   - Interactive options appear: `[Return to Route]` / `[Intentional Exit]`.
4. **Scenario 4 (Rider Approaching)**:
   - Rahul starts 2.5 km behind and catches up. You will see milestone notifications:  
     `Rahul is 2 km away` → `Rahul is 1 km away` → `Rahul is 500 m away` → `Rahul is approaching (200m)`.
5. **Scenario 6 (Flooded Road)**:
   - Flooding erupts at Richmond / Hosur underpass.
   - Click `[Safe Rerouting]` in the sidebar to view **FASTEST**, **SAFEST**, and **BALANCED** reroutes.
   - Click **`Apply to Entire Group`** to update the group's active navigation path!
6. **Scenario 8 (Main Master Demo Scenario)**:
   - Activates heavy rainfall (88 mm/hr), festival crowd congestion (30,000 attendees), triggers multiple flooded corridors, makes Rahul deviate off-route, and causes Akash to fall behind all simultaneously.

### 3. Request Regroup
- When riders become separated, click **`Request Regroup`** in the sidebar.
- The system computes the group centroid, identifies the nearest safe road assembly point (e.g. *NDRI Plaza* or *Domlur Flyover Bay*), drops a pulsing **🏁 REGROUP POINT** pin, and calculates the estimated convergence time (e.g. *6 minutes*).

### 4. Emergency Priority Corridor
- Toggle **`Priority Emergency Corridor`** in the sidebar.
- The route casing shifts to high-visibility golden-amber to designate a priority transit lane for emergency vehicles.
