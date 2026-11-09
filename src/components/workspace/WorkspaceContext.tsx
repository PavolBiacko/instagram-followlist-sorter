"use client";

import { createContext, useContext } from "react";
import type { WorkspaceView } from "@/lib/contracts";

export const WorkspaceContext = createContext<WorkspaceView | null>(null);

/** The loaded workspace. Only available below WorkspaceShell, which handles loading and errors. */
export function useCurrentWorkspace(): WorkspaceView {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useCurrentWorkspace must be used inside WorkspaceShell");
  return workspace;
}
