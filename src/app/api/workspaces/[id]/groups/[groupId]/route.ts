import { NextResponse } from "next/server";
import { updateGroupSchema } from "@/lib/contracts";
import { deleteGroup, updateGroup } from "@/server/groups";
import { handle, parseGroupId, parseWorkspaceId, readJson } from "@/server/http";

type Context = { params: Promise<{ id: string; groupId: string }> };

/** Renames or recolors a group. */
export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id, groupId } = await params;
    const input = await readJson(request, updateGroupSchema);
    return NextResponse.json(await updateGroup(parseWorkspaceId(id), parseGroupId(groupId), input));
  });
}

export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id, groupId } = await params;
    await deleteGroup(parseWorkspaceId(id), parseGroupId(groupId));
    return new Response(null, { status: 204 });
  });
}
