import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { AccountView, ExportEntry, GroupView, ImportPayload, WorkspaceView } from "@/lib/contracts";
import { db, type Database } from "./db/client";
import { accounts, groupMembers, groups, workspaces } from "./db/schema";
import { notFound } from "./http";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Keeps each statement well below Postgres' 65,535 bind-parameter limit.
const CHUNK_SIZE = 1000;

export async function createWorkspace(payload: ImportPayload): Promise<WorkspaceView> {
  const id = await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ ownerUsername: payload.ownerUsername ?? null })
      .returning({ id: workspaces.id });
    await syncAccounts(tx, workspace.id, payload);
    return workspace.id;
  });
  return getWorkspaceView(id);
}

/**
 * Replaces the lists with a newer export. Groups are kept; accounts that disappeared from both
 * lists are removed together with their group memberships.
 */
export async function reimportWorkspace(id: string, payload: ImportPayload): Promise<WorkspaceView> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(workspaces)
      .set({ importedAt: new Date(), ...(payload.ownerUsername ? { ownerUsername: payload.ownerUsername } : {}) })
      .where(eq(workspaces.id, id))
      .returning({ id: workspaces.id });
    if (updated.length === 0) throw notFound("Workspace");
    await syncAccounts(tx, id, payload);
  });
  return getWorkspaceView(id);
}

export async function getWorkspaceView(id: string): Promise<WorkspaceView> {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
  if (!workspace) throw notFound("Workspace");

  const [accountRows, groupRows, memberRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.workspaceId, id)).orderBy(asc(accounts.username)),
    db.select().from(groups).where(eq(groups.workspaceId, id)).orderBy(asc(groups.id)),
    db
      .select({ groupId: groupMembers.groupId, username: accounts.username })
      .from(groupMembers)
      .innerJoin(accounts, eq(accounts.id, groupMembers.accountId))
      .where(eq(accounts.workspaceId, id))
      .orderBy(asc(accounts.username)),
  ]);

  const membersByGroup = new Map<number, string[]>();
  for (const row of memberRows) {
    const members = membersByGroup.get(row.groupId) ?? [];
    members.push(row.username);
    membersByGroup.set(row.groupId, members);
  }

  return {
    id: workspace.id,
    ownerUsername: workspace.ownerUsername,
    importedAt: workspace.importedAt.toISOString(),
    accounts: accountRows.map(
      (row): AccountView => ({
        username: row.username,
        followsMe: row.followsMe,
        followedByMe: row.followedByMe,
        followsMeSince: row.followsMeSince?.toISOString() ?? null,
        followedByMeSince: row.followedByMeSince?.toISOString() ?? null,
        avatarUrl: row.avatarUrl,
      }),
    ),
    groups: groupRows.map(
      (row): GroupView => ({
        id: row.id,
        name: row.name,
        color: row.color,
        members: membersByGroup.get(row.id) ?? [],
      }),
    ),
  };
}

export async function deleteWorkspace(id: string): Promise<void> {
  const deleted = await db.delete(workspaces).where(eq(workspaces.id, id)).returning({ id: workspaces.id });
  if (deleted.length === 0) throw notFound("Workspace");
}

async function syncAccounts(tx: Transaction, workspaceId: string, payload: ImportPayload) {
  const followers = indexByUsername(payload.followers);
  const following = indexByUsername(payload.following);
  const usernames = new Set([...followers.keys(), ...following.keys()]);

  const existing = await tx
    .select({ id: accounts.id, username: accounts.username })
    .from(accounts)
    .where(eq(accounts.workspaceId, workspaceId));
  const staleIds = existing.filter((row) => !usernames.has(row.username)).map((row) => row.id);
  for (const ids of chunk(staleIds)) {
    await tx.delete(accounts).where(and(eq(accounts.workspaceId, workspaceId), inArray(accounts.id, ids)));
  }

  const rows = [...usernames].map((username) => {
    const follower = followers.get(username);
    const followed = following.get(username);
    return {
      workspaceId,
      username,
      followsMe: follower !== undefined,
      followedByMe: followed !== undefined,
      followsMeSince: toDate(follower?.since),
      followedByMeSince: toDate(followed?.since),
    };
  });
  for (const batch of chunk(rows)) {
    await tx
      .insert(accounts)
      .values(batch)
      .onConflictDoUpdate({
        target: [accounts.workspaceId, accounts.username],
        set: {
          followsMe: sql`excluded.follows_me`,
          followedByMe: sql`excluded.followed_by_me`,
          followsMeSince: sql`excluded.follows_me_since`,
          followedByMeSince: sql`excluded.followed_by_me_since`,
        },
      });
  }
}

function indexByUsername(entries: ExportEntry[]): Map<string, ExportEntry> {
  return new Map(entries.map((entry) => [entry.username, entry]));
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

function chunk<T>(items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += CHUNK_SIZE) {
    chunks.push(items.slice(start, start + CHUNK_SIZE));
  }
  return chunks;
}
