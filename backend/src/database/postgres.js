import pg from "pg";

const { Pool } = pg;

function connectionStringWithLibpqSslCompatibility(connectionString) {
  if (!connectionString) return connectionString;
  try {
    const parsed = new URL(connectionString);
    if (parsed.searchParams.get("sslmode") === "require" && !parsed.searchParams.has("uselibpqcompat")) {
      parsed.searchParams.set("uselibpqcompat", "true");
    }
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

export const pool = new Pool({ connectionString: connectionStringWithLibpqSslCompatibility(process.env.DATABASE_URL) });

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Configure PostgreSQL/PostGIS in backend/.env.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
  await pool.query("CREATE EXTENSION IF NOT EXISTS postgis");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS riders (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rides (
      id UUID PRIMARY KEY,
      code CHAR(6) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      leader_id UUID NOT NULL REFERENCES riders(id),
      start_location JSONB NOT NULL,
      destination JSONB NOT NULL,
      planned_route JSONB,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      emergency_corridor_active BOOLEAN NOT NULL DEFAULT FALSE,
      active_reroute JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ride_members (
      ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ride_id, rider_id)
    );
    CREATE TABLE IF NOT EXISTS rider_locations (
      ride_id UUID NOT NULL,
      rider_id UUID NOT NULL,
      position geography(Point, 4326) NOT NULL,
      accuracy_m REAL,
      speed_kph REAL,
      heading REAL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ride_id, rider_id),
      FOREIGN KEY (ride_id, rider_id) REFERENCES ride_members(ride_id, rider_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS rider_locations_position_idx ON rider_locations USING GIST(position);
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id UUID PRIMARY KEY,
      ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
      created_by UUID NOT NULL REFERENCES riders(id),
      type TEXT NOT NULL DEFAULT 'SOS',
      message TEXT NOT NULL,
      position geography(Point, 4326) NOT NULL,
      radius_m INTEGER NOT NULL DEFAULT 10000,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')),
      acknowledged_by UUID REFERENCES riders(id),
      acknowledged_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES riders(id),
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS emergency_alerts_position_idx ON emergency_alerts USING GIST(position);
    CREATE TABLE IF NOT EXISTS emergency_alert_recipients (
      alert_id UUID NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
      rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
      distance_m REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (alert_id, rider_id)
    );
  `);
  // Migrate existing DB instances — safe to run repeatedly
  await pool.query(`
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS emergency_corridor_active BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS active_reroute JSONB;
  `);
}
