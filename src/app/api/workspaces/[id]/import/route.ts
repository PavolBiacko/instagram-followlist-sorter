import { NextResponse } from "next/server";
import { importPayloadSchema } from "@/lib/contracts";
import { handle, parseWorkspaceId, readJson } from "@/server/http";
import { reimportWorkspace } from "@/server/workspaces";

type Context = { params: Promise<{ id: string }> };

/** Replaces the lists with a newer export while keeping the groups. */
export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const id = parseWorkspaceId((await params).id);
    const payload = await readJson(request, importPayloadSchema);
    return NextResponse.json(await reimportWorkspace(id, payload));
  });
}
