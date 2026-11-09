import { addMember, removeMember } from "@/server/groups";
import { handle, parseGroupId, parseWorkspaceId } from "@/server/http";

type Context = { params: Promise<{ id: string; groupId: string; username: string }> };

/** Adds an account to a group. Repeating the call is harmless. */
export function PUT(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id, groupId, username } = await params;
    await addMember(parseWorkspaceId(id), parseGroupId(groupId), username);
    return new Response(null, { status: 204 });
  });
}

export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id, groupId, username } = await params;
    await removeMember(parseWorkspaceId(id), parseGroupId(groupId), username);
    return new Response(null, { status: 204 });
  });
}
