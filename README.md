# ResilientUrban

> **Geospatial Disaster Intelligence & Group-Rider Coordination Platform**  
> Disaster-aware navigation, multi-rider live telemetry, route corridor deviation detection, automated squad regrouping, and dynamic hazard-avoidance routing for Bengaluru.

> **Data status:** Rider accounts, rides, current shared GPS locations, and SOS alerts are stored in PostgreSQL. Live rider tracking is opt-in for each active ride. TomTom and Open-Meteo check the planned route and recent shared GPS. Ticket Fairy public event listings are checked in active route countries; its coverage varies by market, and listings are congestion hints only. No police dispatch or verified public-gathering feed is configured. The simulation remains a separate demo mode.

---

## 1. Product Capabilities

### A. Disaster Intelligence
- **Dynamic Road Statuses**: Classifies road network segments into `SAFE`, `CONGESTED`, `AT_RISK`, `HAZARDOUS`, `CRITICAL`, and `BLOCKED`.
- **Multi-Factor Risk Engine**: Combines active road hazards with the current simulation inputs. Ticketed event listings do not provide attendee counts and are never treated as verified crowd or closure data.
- **Traffic-Aware Route Options**: Requests motorcycle routes and traffic-based ETAs from TomTom, then ranks returned alternatives by travel time and detected hazard exposure. Falls back to OSRM when TomTom routing is unavailable.
- **Emergency Priority Corridor**: Allows designating high-resilience clearance corridors for rescue teams and emergency responders.
- **Weather Alerts**: Polls Open-Meteo around active planned routes and recent shared rider locations, then flags severe weather conditions.
- **Public Event Hints**: Loads Ticket Fairy public listings for countries on active rides. Events do not confirm crowds, traffic impact, or road closures; coverage depends on events listed with Ticket Fairy.

### B. Group Ride & Rider Coordination
- **Opt-in Live Rider Tracking**: Riders choose “Share live location” during an active ride. Browser GPS (`navigator.geolocation.watchPosition`) sends throttled updates over authenticated **WebSockets (Socket.IO)**. Turning sharing off removes the current saved position.
- **Rider Accounts and Ride Codes**: Each rider signs in separately and joins a group with its six-digit code.
- **Ride Lifecycle**: Riders can leave the group; the leader can end the ride for everyone. Leaving removes that rider's current GPS record; ending clears every location for the ride.
- **Relative Rider Telemetry**: Calculates exact distance and orientation relative to user or leader (e.g., *"Rahul: 1.2 km ahead • ETA 4m"* vs *"Akash: 800m behind"*).
- **Proximity Notifications**: Configurable proximity milestone alerts (2 km, 1 km, 500m, 200m, arrived) with state-tracked deduplication.
- **Route Corridor Deviation Detection**: Calculates perpendicular distance from the planned route polyline:
  - `NORMAL`: < 100m
  - `WARNING`: 100m – 300m
  - `OFF_ROUTE`: > 300m (triggers rider prompt: *[Return to Route]* / *[Intentionally Leave Route]*)
  - `CRITICAL`: > 1 km (triggers squad alert)
- **Group Separation Detection**: Tracks squad dispersion (`GROUPED` < 1km, `SPREAD OUT` 1–3km, `SEPARATED` 3–5km, `CRITICAL` > 5km).
- **Automated Regrouping**: Computes group centroid and recommends the nearest safe road assembly point (safe bays, plazas, transit plazas) with convergence ETA.

### C. SOS Response
- Send an SOS with current GPS to online riders in the same ride and riders with a recent location within 10 km.
- Recipients can acknowledge that they are responding. The person who raised the alert or the responder who acknowledged it can mark it resolved.
- SOS status and recipients are persisted, and updates are delivered over Socket.IO.

---

## 2. Architecture

```
+---------------------------------------------------------------------------------+
|                                CLIENT (Browser)                                 |
|          React 18 + Leaflet (OpenStreetMap) + Tailwind CSS + Socket.IO          |
|                                                                                 |
|   [ Top Bar: Start/Join Ride | Reports ]                                        |
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
|   | - 6-Digit Codes     |  | - TomTom + OSRM     |  | - Multi-factor Risk |     |
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
|   |                   PostgreSQL + PostGIS                                  |   |
|   |   Riders, rides, members, latest GPS, SOS alerts, and recipients         |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------+-----------------------------------------+
                                        |
                         External Open Geospatial APIs
                                        |
                  +---------------------v---------------------+
                  |   TomTom Traffic Routing / OSRM fallback  |
                  |       OpenStreetMap / Carto Dark Tiles    |
                  +-------------------------------------------+
```

---

## 3. How to Run Locally

### Prerequisites
- Node.js v18+ or v20+
- PostgreSQL with PostGIS enabled

### Database and rider accounts
1. Create a PostgreSQL database named `resilienturban` and make sure the PostGIS extension is available.
2. Copy `backend/.env.example` to `backend/.env`; set `DATABASE_URL` and replace `JWT_SECRET` with a unique random secret of at least 32 characters.
3. Set `TOMTOM_API_KEY` in `backend/.env` to enable TomTom traffic incidents and traffic-aware motorcycle routing. The key is used only by the backend. Without it, routing falls back to OSRM and TomTom incidents stay disabled.
4. Set `TOMTOM_API_KEY` to enable country lookup for localized Ticket Fairy listings. Ticket Fairy public reads require no separate event API key. Weather uses Open-Meteo and does not require a key.
5. Run `npm install` in `backend` and start the backend. It creates the rider, ride, membership, latest-location, and SOS tables on startup.
6. Open the frontend, register each rider with an email and password, create a ride using “Use my GPS location,” and share its six-digit code. Other riders sign in and join with that code. In the active ride panel, each rider must turn on “Share live location” to appear on the live map. GPS requires permission and a secure browser context (localhost or HTTPS).

The server checks the logged-in rider and ride membership before joining the WebSocket room or accepting GPS. The database stores only the current position for that ride; opting out deletes it. SOS records retain their location so responders can find the reported incident.

TomTom polls traffic incidents once per minute; Open-Meteo polls weather every five minutes; Ticket Fairy polls public event listings every fifteen minutes. Ticket Fairy locations are limited to events published on that platform, so an empty response does not establish that no event is happening. TomTom reverse geocoding identifies the country for event lookup. Feeds check the planned ride route and recent shared GPS, so route warnings can arrive before departure; live rider tracking itself remains opt-in. The explicitly selected start and planned route are sent to these external providers for those checks. Turning live sharing off stops live GPS updates and removes the stored current position, but does not remove the route from the ride. Provider status is available at `/api/health`. No police incident feed is configured, and public event listings do not verify a gathering, road closure, or crowd size.

SOS alerts notify same-ride members and accounts with recent GPS within a default 10 km radius. Recipients need an active app connection to receive the immediate popup; they can also load nearby alerts when they start sharing GPS. Browser sound and speech require the user to interact with the page first.

### Option A: Services are already running
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:5000](http://localhost:5000)

---

### Option B: Running from Scratch via Terminal

#### Terminal 1 — Start Backend Server
```powershell
cd backend
copy .env.example .env
npm install
node src/server.js
# Configure backend/.env before starting
```

#### Terminal 2 — Start Frontend Dev Server
```powershell
cd frontend
npm run dev -- --host --port 3000
# Output: VITE ready at http://localhost:3000/
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. How to Test All Features (Demo Walkthrough)

### 1. Group Ride Coordination & Live Roster
- Create a ride and share its generated six-digit code, or join using a code from another rider.
- In the left sidebar under the rider roster, observe:
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
