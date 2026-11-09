import { NextResponse } from "next/server";
import { handle, parseWorkspaceId } from "@/server/http";
import { deleteWorkspace, getWorkspaceView } from "@/server/workspaces";

type Context = { params: Promise<{ id: string }> };

export function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const id = parseWorkspaceId((await params).id);
    return NextResponse.json(await getWorkspaceView(id));
  });
}

/** Deletes the workspace with all its accounts and groups. */
export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const id = parseWorkspaceId((await params).id);
    await deleteWorkspace(id);
    return new Response(null, { status: 204 });
  });
}
