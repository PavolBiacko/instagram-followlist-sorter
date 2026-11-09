import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const DEFAULT_URL = "postgres://followlist:followlist@localhost:5432/followlist";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { followlistPool?: Pool };

const pool =
  globalForDb.followlistPool ??
  new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_URL, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.followlistPool = pool;
}

export const db: Database = drizzle(pool, { schema });

export function closeDb(): Promise<void> {
  return pool.end();
}
