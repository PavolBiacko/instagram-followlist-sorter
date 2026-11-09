"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useToast } from "@/components/Toast";
import { api } from "./api-client";
import type { CreateGroupInput, GroupView, UpdateGroupInput, WorkspaceView } from "./contracts";

export const workspaceKey = (id: string) => ["workspace", id] as const;

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKey(id),
    queryFn: () => api.getWorkspace(id),
    // This tab is the only writer, and every mutation updates the cache itself.
    staleTime: Infinity,
    retry: (count, error) => !("status" in error && error.status === 404) && count < 2,
  });
}

/** Group → members lookups the overview and stats need. */
export function useGroupIndex(workspace: WorkspaceView | undefined) {
  return useMemo(() => {
    const groupsByUsername = new Map<string, GroupView[]>();
    for (const group of workspace?.groups ?? []) {
      for (const username of group.members) {
        const list = groupsByUsername.get(username) ?? [];
        list.push(group);
        groupsByUsername.set(username, list);
      }
    }
    return { groupsByUsername };
  }, [workspace]);
}

/**
 * Group mutations with optimistic cache updates, so drag and drop feels instant.
 * On failure the change is reverted and the server's message is shown.
 */
export function useGroupActions(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = workspaceKey(workspaceId);

  const updateGroups = (update: (groups: GroupView[]) => GroupView[]) =>
    queryClient.setQueryData<WorkspaceView>(key, (workspace) =>
      workspace ? { ...workspace, groups: update(workspace.groups) } : workspace,
    );

  const resync = (error: Error) => {
    toast.show(error.message, "error");
    return queryClient.invalidateQueries({ queryKey: key });
  };

  const createGroup = useMutation({
    mutationFn: (input: CreateGroupInput) => api.createGroup(workspaceId, input),
    onSuccess: (group) => updateGroups((groups) => [...groups, group]),
    onError: (error) => toast.show(error.message, "error"),
  });

  const updateGroup = useMutation({
    mutationFn: ({ groupId, input }: { groupId: number; input: UpdateGroupInput }) =>
      api.updateGroup(workspaceId, groupId, input),
    onMutate: ({ groupId, input }) =>
      updateGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, ...stripUndefined(input) } : g))),
    onError: resync,
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: number) => api.deleteGroup(workspaceId, groupId),
    onMutate: (groupId) => updateGroups((groups) => groups.filter((g) => g.id !== groupId)),
    onError: resync,
  });

  const setMembership = useMutation({
    mutationFn: ({ groupId, username, isMember }: MembershipChange) =>
      isMember ? api.addMember(workspaceId, groupId, username) : api.removeMember(workspaceId, groupId, username),
    onMutate: (change) => updateGroups((groups) => applyMembership(groups, change)),
    onError: (error, change) => {
      // Revert only this change, so other changes made in the meantime survive.
      updateGroups((groups) => applyMembership(groups, { ...change, isMember: !change.isMember }));
      toast.show(error.message, "error");
    },
  });

  return { createGroup, updateGroup, deleteGroup, setMembership };
}

export interface MembershipChange {
  groupId: number;
  username: string;
  isMember: boolean;
}

function applyMembership(groups: GroupView[], { groupId, username, isMember }: MembershipChange): GroupView[] {
  return groups.map((group) => {
    if (group.id !== groupId) return group;
    const without = group.members.filter((member) => member !== username);
    return { ...group, members: isMember ? [...without, username].sort() : without };
  });
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
