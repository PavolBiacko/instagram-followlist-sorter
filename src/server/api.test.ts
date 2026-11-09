import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as groupRoute from "@/app/api/workspaces/[id]/groups/[groupId]/route";
import * as memberRoute from "@/app/api/workspaces/[id]/groups/[groupId]/members/[username]/route";
import * as groupsRoute from "@/app/api/workspaces/[id]/groups/route";
import * as importRoute from "@/app/api/workspaces/[id]/import/route";
import * as workspaceRoute from "@/app/api/workspaces/[id]/route";
import * as workspacesRoute from "@/app/api/workspaces/route";
import type { GroupView, ImportPayload, WorkspaceView } from "@/lib/contracts";
import { closeDb, db } from "./db/client";
import { runMigrations } from "./db/migrate";

// Integration tests against a real Postgres (see TEST_DATABASE_URL in vitest.config.ts).

const BASE = "http://localhost/api/workspaces";

function jsonRequest(method: string, body: unknown) {
  return new Request(BASE, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

const payload: ImportPayload = {
  ownerUsername: "pali",
  followers: [
    { username: "anna", since: 1700000000 },
    { username: "boris", since: null },
  ],
  following: [
    { username: "anna", since: 1690000000 },
    { username: "natgeo", since: null },
  ],
};

async function createWorkspace(body: ImportPayload = payload): Promise<WorkspaceView> {
  const response = await workspacesRoute.POST(jsonRequest("POST", body));
  expect(response.status).toBe(201);
  return response.json();
}

async function createGroup(workspaceId: string, name = "Close friends"): Promise<GroupView> {
  const response = await groupsRoute.POST(jsonRequest("POST", { name, color: "#6f9e7f" }), ctx({ id: workspaceId }));
  expect(response.status).toBe(201);
  return response.json();
}

async function getWorkspace(id: string): Promise<WorkspaceView> {
  const response = await workspaceRoute.GET(new Request(BASE), ctx({ id }));
  expect(response.status).toBe(200);
  return response.json();
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await db.execute(sql`truncate workspace cascade`);
});

afterAll(async () => {
  await closeDb();
});

describe("workspaces API", () => {
  it("creates a workspace that merges followers and following", async () => {
    const workspace = await createWorkspace();

    expect(workspace.ownerUsername).toBe("pali");
    expect(workspace.groups).toEqual([]);
    expect(workspace.accounts.map((a) => [a.username, a.followsMe, a.followedByMe])).toEqual([
      ["anna", true, true],
      ["boris", true, false],
      ["natgeo", false, true],
    ]);
    expect(workspace.accounts[0].followsMeSince).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("rejects invalid payloads with a readable message", async () => {
    const response = await workspacesRoute.POST(jsonRequest("POST", { followers: [{ username: "Not Valid!" }] }));

    expect(response.status).toBe(400);
    expect((await response.json()).detail).toMatch(/followers\.0/);
  });

  it("answers 404 for unknown or malformed ids", async () => {
    const unknown = await workspaceRoute.GET(new Request(BASE), ctx({ id: crypto.randomUUID() }));
    const malformed = await workspaceRoute.GET(new Request(BASE), ctx({ id: "nope" }));

    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(404);
  });

  it("adds and removes group members idempotently", async () => {
    const { id } = await createWorkspace();
    const group = await createGroup(id);
    const memberCtx = ctx({ id, groupId: String(group.id), username: "anna" });

    expect((await memberRoute.PUT(new Request(BASE), memberCtx)).status).toBe(204);
    expect((await memberRoute.PUT(new Request(BASE), memberCtx)).status).toBe(204);
    expect((await getWorkspace(id)).groups[0].members).toEqual(["anna"]);

    expect((await memberRoute.DELETE(new Request(BASE), memberCtx)).status).toBe(204);
    expect((await getWorkspace(id)).groups[0].members).toEqual([]);
  });

  it("rejects members who aren't in the lists", async () => {
    const { id } = await createWorkspace();
    const group = await createGroup(id);

    const response = await memberRoute.PUT(new Request(BASE), ctx({ id, groupId: String(group.id), username: "stranger" }));

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toBe("Account not found.");
  });

  it("renames, recolors and deletes groups", async () => {
    const { id } = await createWorkspace();
    const group = await createGroup(id);
    const groupCtx = ctx({ id, groupId: String(group.id) });

    const renamed = await groupRoute.PATCH(jsonRequest("PATCH", { name: "  Family ", color: "#C07D93" }), groupCtx);
    expect(await renamed.json()).toMatchObject({ name: "Family", color: "#c07d93" });

    expect((await groupRoute.DELETE(new Request(BASE), groupCtx)).status).toBe(204);
    expect((await getWorkspace(id)).groups).toEqual([]);
  });

  it("keeps groups on re-import and drops accounts that left both lists", async () => {
    const { id } = await createWorkspace();
    const group = await createGroup(id);
    for (const username of ["anna", "boris"]) {
      await memberRoute.PUT(new Request(BASE), ctx({ id, groupId: String(group.id), username }));
    }

    const response = await importRoute.POST(
      jsonRequest("POST", { followers: [{ username: "anna", since: null }], following: [{ username: "cyril", since: null }] }),
      ctx({ id }),
    );
    const workspace: WorkspaceView = await response.json();

    expect(response.status).toBe(200);
    expect(workspace.ownerUsername).toBe("pali");
    expect(workspace.accounts.map((a) => [a.username, a.followsMe, a.followedByMe])).toEqual([
      ["anna", true, false],
      ["cyril", false, true],
    ]);
    expect(workspace.groups[0].members).toEqual(["anna"]);
  });

  it("deletes a workspace with everything in it", async () => {
    const { id } = await createWorkspace();
    await createGroup(id);

    expect((await workspaceRoute.DELETE(new Request(BASE), ctx({ id }))).status).toBe(204);
    expect((await workspaceRoute.GET(new Request(BASE), ctx({ id }))).status).toBe(404);
  });
});
