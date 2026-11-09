import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** Used by Docker and Render health checks. Fails when the database is unreachable. */
export function GET() {
  return handle(async () => {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  });
}
