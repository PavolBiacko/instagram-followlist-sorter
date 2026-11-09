"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { forgetWorkspace, rememberWorkspace } from "@/lib/recent-workspaces";
import { useWorkspace } from "@/lib/workspace-queries";
import { Wordmark } from "../Wordmark";
import { WorkspaceContext } from "./WorkspaceContext";
import { WorkspaceHeader } from "./WorkspaceHeader";
import styles from "./WorkspaceShell.module.css";

export function WorkspaceShell({ id, children }: { id: string; children: ReactNode }) {
  const { data: workspace, error, refetch } = useWorkspace(id);
  const isMissing = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (workspace) rememberWorkspace(workspace.id, workspace.ownerUsername);
  }, [workspace]);

  useEffect(() => {
    if (isMissing) forgetWorkspace(id);
  }, [id, isMissing]);

  if (error) {
    return (
      <Notice
        title={isMissing ? "These lists don’t exist" : "Your lists didn’t load"}
        body={
          isMissing
            ? "The link is wrong, or the lists were deleted. Upload your export again to start over."
            : error.message
        }
        action={
          isMissing ? (
            <Link href="/" className="button button-primary">
              Upload an export
            </Link>
          ) : (
            <button type="button" className="button button-primary" onClick={() => refetch()}>
              Try again
            </button>
          )
        }
      />
    );
  }

  if (!workspace) {
    return <Notice title="Loading your lists…" />;
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className={styles.shell}>
        <WorkspaceHeader workspace={workspace} />
        <main className={styles.main}>{children}</main>
      </div>
    </WorkspaceContext.Provider>
  );
}

function Notice({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={styles.notice}>
      <Wordmark />
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
