import { and, asc, eq } from "drizzle-orm";
import type { CreateGroupInput, GroupView, UpdateGroupInput } from "@/lib/contracts";
import { db } from "./db/client";
import { accounts, groupMembers, groups, workspaces } from "./db/schema";
import { notFound } from "./http";

export async function createGroup(workspaceId: string, input: CreateGroupInput): Promise<GroupView> {
  const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!workspace) throw notFound("Workspace");

  const [group] = await db
    .insert(groups)
    .values({ workspaceId, name: input.name, color: input.color.toLowerCase() })
    .returning();
  return { id: group.id, name: group.name, color: group.color, members: [] };
}

export async function updateGroup(workspaceId: string, groupId: number, input: UpdateGroupInput): Promise<GroupView> {
  const [group] = await db
    .update(groups)
    .set({ name: input.name, color: input.color?.toLowerCase() })
    .where(and(eq(groups.id, groupId), eq(groups.workspaceId, workspaceId)))
    .returning();
  if (!group) throw notFound("Group");

  const members = await db
    .select({ username: accounts.username })
    .from(groupMembers)
    .innerJoin(accounts, eq(accounts.id, groupMembers.accountId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(accounts.username));
  return { id: group.id, name: group.name, color: group.color, members: members.map((row) => row.username) };
}

export async function deleteGroup(workspaceId: string, groupId: number): Promise<void> {
  const deleted = await db
    .delete(groups)
    .where(and(eq(groups.id, groupId), eq(groups.workspaceId, workspaceId)))
    .returning({ id: groups.id });
  if (deleted.length === 0) throw notFound("Group");
}

/** Idempotent: adding someone who is already in the group changes nothing. */
export async function addMember(workspaceId: string, groupId: number, username: string): Promise<void> {
  const { accountId } = await resolveMembership(workspaceId, groupId, username);
  await db.insert(groupMembers).values({ groupId, accountId }).onConflictDoNothing();
}

/** Idempotent: removing someone who isn't in the group changes nothing. */
export async function removeMember(workspaceId: string, groupId: number, username: string): Promise<void> {
  const { accountId } = await resolveMembership(workspaceId, groupId, username);
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.accountId, accountId)));
}

async function resolveMembership(workspaceId: string, groupId: number, username: string) {
  const [[group], [account]] = await Promise.all([
    db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.workspaceId, workspaceId))),
    db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.workspaceId, workspaceId), eq(accounts.username, username.toLowerCase()))),
  ]);
  if (!group) throw notFound("Group");
  if (!account) throw notFound("Account");
  return { accountId: account.id };
}
