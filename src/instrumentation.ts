/** Next.js calls this once when the server starts: bring the database schema up to date. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./server/db/migrate");
    await runMigrations();
  }
}
