"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { WorkspaceView } from "@/lib/contracts";
import { parseExportFiles } from "@/lib/instagram-export";
import { forgetWorkspace } from "@/lib/recent-workspaces";
import { workspaceKey } from "@/lib/workspace-queries";
import { Icon } from "../Icon";
import { Popover } from "../Popover";
import { useToast } from "../Toast";
import { Wordmark } from "../Wordmark";
import styles from "./WorkspaceHeader.module.css";

export function WorkspaceHeader({ workspace }: { workspace: WorkspaceView }) {
  const pathname = usePathname();
  const base = `/w/${workspace.id}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/stats`, label: "Stats" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Wordmark />
        <span className={styles.owner}>
          {workspace.ownerUsername ? `@${workspace.ownerUsername}` : "Your lists"}
          <span className={styles.imported}>
            Imported {new Date(workspace.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </span>
      </div>

      <nav className={styles.tabs} aria-label="Sections">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={pathname === tab.href ? "page" : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className={styles.actions}>
        <UpdateExportButton workspaceId={workspace.id} />
        <CopyLinkButton />
        <DeleteWorkspaceButton workspaceId={workspace.id} />
      </div>
    </header>
  );
}

function UpdateExportButton({ workspaceId }: { workspaceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const reimport = useMutation({
    mutationFn: async (files: File[]) => api.reimport(workspaceId, await parseExportFiles(files)),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKey(workspaceId), workspace);
      toast.show(`Lists updated. ${workspace.accounts.length} accounts, groups kept.`);
    },
    onError: (error) => toast.show(error.message, "error"),
  });

  return (
    <>
      <button
        type="button"
        className="button button-ghost"
        onClick={() => inputRef.current?.click()}
        disabled={reimport.isPending}
        title="Upload a newer export. Your groups stay as they are."
      >
        <Icon name="upload" size={16} />
        <span className={styles.actionLabel}>{reimport.isPending ? "Updating…" : "Update export"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept=".zip,.json,application/zip,application/json"
        multiple
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) reimport.mutate(files);
        }}
      />
    </>
  );
}

function CopyLinkButton() {
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.show("Link copied. Anyone with it can see and edit these lists.");
    } catch {
      toast.show("Copying isn't allowed here. Copy the address from the browser bar.", "error");
    }
  };

  return (
    <button type="button" className="button button-ghost" onClick={copy}>
      <Icon name="link" size={16} />
      <span className={styles.actionLabel}>Copy link</span>
    </button>
  );
}

function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const remove = useMutation({
    mutationFn: () => api.deleteWorkspace(workspaceId),
    onSuccess: () => {
      forgetWorkspace(workspaceId);
      router.push("/");
      queryClient.removeQueries({ queryKey: workspaceKey(workspaceId) });
      toast.show("Lists deleted.");
    },
    onError: (error) => toast.show(error.message, "error"),
  });

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label="Delete these lists"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Icon name="trash" size={17} />
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} label="Delete these lists" width={280}>
          <div className={styles.confirm}>
            <p>Delete these lists and all groups? This can’t be undone.</p>
            <button type="button" className="button button-danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete lists"}
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}
