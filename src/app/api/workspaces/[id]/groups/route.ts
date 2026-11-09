import { NextResponse } from "next/server";
import { createGroupSchema } from "@/lib/contracts";
import { createGroup } from "@/server/groups";
import { handle, parseWorkspaceId, readJson } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const workspaceId = parseWorkspaceId((await params).id);
    const input = await readJson(request, createGroupSchema);
    return NextResponse.json(await createGroup(workspaceId, input), { status: 201 });
  });
}
