import { NextResponse } from "next/server";
import { importPayloadSchema } from "@/lib/contracts";
import { handle, readJson } from "@/server/http";
import { createWorkspace } from "@/server/workspaces";

/** Creates a workspace from lists parsed in the browser. */
export function POST(request: Request) {
  return handle(async () => {
    const payload = await readJson(request, importPayloadSchema);
    const workspace = await createWorkspace(payload);
    return NextResponse.json(workspace, { status: 201 });
  });
}
