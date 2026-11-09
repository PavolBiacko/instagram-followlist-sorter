import { NextResponse } from "next/server";
import { z } from "zod";
import type { Problem } from "@/lib/contracts";

/** An error whose message is safe and useful to show to the user. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found.`);

const TITLES: Record<number, string> = {
  400: "Bad request",
  404: "Not found",
  500: "Internal server error",
};

export function problem(status: number, detail: string): NextResponse<Problem> {
  return NextResponse.json(
    { status, title: TITLES[status] ?? "Error", detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}

/** Wraps a route handler so thrown errors become problem responses. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) return problem(error.status, error.message);
    console.error(error);
    return problem(500, "Something went wrong on the server. Try again.");
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "The request body must be JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join(".")} ${issue.message}` : issue.message))
      .join("; ");
    throw new HttpError(400, detail);
  }
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Workspace ids are UUIDs; anything else can't exist, so answer 404 before touching the database. */
export function parseWorkspaceId(raw: string): string {
  if (!UUID.test(raw)) throw notFound("Workspace");
  return raw.toLowerCase();
}

export function parseGroupId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound("Group");
  return id;
}
