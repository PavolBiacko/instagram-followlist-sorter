import type {
  CreateGroupInput,
  GroupView,
  ImportPayload,
  Problem,
  UpdateGroupInput,
  WorkspaceView,
} from "./contracts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    throw new ApiError(response.status, problem?.detail ?? `Request failed with status ${response.status}.`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const json = (body: unknown) => JSON.stringify(body);
const member = (workspaceId: string, groupId: number, username: string) =>
  `/workspaces/${workspaceId}/groups/${groupId}/members/${encodeURIComponent(username)}`;

export const api = {
  createWorkspace: (payload: ImportPayload) =>
    request<WorkspaceView>("/workspaces", { method: "POST", body: json(payload) }),

  getWorkspace: (id: string) => request<WorkspaceView>(`/workspaces/${id}`),

  reimport: (id: string, payload: ImportPayload) =>
    request<WorkspaceView>(`/workspaces/${id}/import`, { method: "POST", body: json(payload) }),

  deleteWorkspace: (id: string) => request<void>(`/workspaces/${id}`, { method: "DELETE" }),

  createGroup: (id: string, input: CreateGroupInput) =>
    request<GroupView>(`/workspaces/${id}/groups`, { method: "POST", body: json(input) }),

  updateGroup: (id: string, groupId: number, input: UpdateGroupInput) =>
    request<GroupView>(`/workspaces/${id}/groups/${groupId}`, { method: "PATCH", body: json(input) }),

  deleteGroup: (id: string, groupId: number) =>
    request<void>(`/workspaces/${id}/groups/${groupId}`, { method: "DELETE" }),

  addMember: (id: string, groupId: number, username: string) =>
    request<void>(member(id, groupId, username), { method: "PUT" }),

  removeMember: (id: string, groupId: number, username: string) =>
    request<void>(member(id, groupId, username), { method: "DELETE" }),
};
