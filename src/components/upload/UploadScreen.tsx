"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { GROUP_COLORS } from "@/lib/group-colors";
import { parseExportFiles } from "@/lib/instagram-export";
import { readRecentWorkspaces, rememberWorkspace, type RecentWorkspace } from "@/lib/recent-workspaces";
import { normalizeUsername } from "@/lib/usernames";
import { workspaceKey } from "@/lib/workspace-queries";
import { Avatar } from "../Avatar";
import { Wordmark } from "../Wordmark";
import { ExportDropzone } from "./ExportDropzone";
import styles from "./UploadScreen.module.css";

const EXPORT_STEPS = [
  "In Instagram, open Accounts Center, then Your information and permissions, then Export your information.",
  "Create an export to your device and pick only “Followers and following”.",
  "Set the date range to All time and the format to JSON.",
  "When Instagram says the export is ready, download the ZIP and drop it here.",
];

export function UploadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [ownerInput, setOwnerInput] = useState("");
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);

  useEffect(() => setRecent(readRecentWorkspaces()), []);

  const open = useMutation({
    mutationFn: async () => {
      const lists = await parseExportFiles(files);
      return api.createWorkspace({ ownerUsername: normalizeUsername(ownerInput), ...lists });
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKey(workspace.id), workspace);
      rememberWorkspace(workspace.id, workspace.ownerUsername);
      router.push(`/w/${workspace.id}`);
    },
  });

  const ownerIsInvalid = ownerInput.trim() !== "" && normalizeUsername(ownerInput) === null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (files.length > 0 && !ownerIsInvalid) open.mutate();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Wordmark />
      </header>

      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1 className={styles.headline}>Sort the people you follow into groups.</h1>
          <p className={styles.lede}>
            Upload your Instagram data export, then drag accounts into groups like Close friends, Work or Old
            classmates. There’s no login: your lists live behind a private link.
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Your Instagram username</span>
              <span className={styles.prefixed}>
                <span aria-hidden="true">@</span>
                <input
                  className="text-input"
                  value={ownerInput}
                  onChange={(event) => setOwnerInput(event.target.value)}
                  placeholder="username"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={ownerIsInvalid}
                  aria-describedby="owner-hint"
                />
              </span>
              <span id="owner-hint" className={ownerIsInvalid ? styles.fieldError : styles.hint}>
                {ownerIsInvalid
                  ? "Use letters, numbers, dots and underscores only."
                  : "Optional. Used as the title of your lists."}
              </span>
            </label>

            <ExportDropzone files={files} onChange={setFiles} disabled={open.isPending} />

            {open.error && (
              <p className={styles.error} role="alert">
                {open.error.message}
              </p>
            )}

            <div className={styles.submitRow}>
              <button
                type="submit"
                className="button button-primary"
                disabled={files.length === 0 || ownerIsInvalid || open.isPending}
              >
                {open.isPending ? "Opening your lists…" : "Open my lists"}
              </button>
              <span className={styles.hint}>Only usernames and follow dates leave your browser.</span>
            </div>
          </form>
        </div>

        <SortingPreview />
      </section>

      <section className={styles.steps} aria-labelledby="steps-title">
        <h2 id="steps-title" className={styles.sectionTitle}>
          How to get your export
        </h2>
        <ol>
          {EXPORT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {recent.length > 0 && (
        <section className={styles.recent} aria-labelledby="recent-title">
          <h2 id="recent-title" className={styles.sectionTitle}>
            Recently opened
          </h2>
          <ul>
            {recent.map((entry) => (
              <li key={entry.id}>
                <Link href={`/w/${entry.id}`}>{entry.ownerUsername ? `@${entry.ownerUsername}` : "Untitled lists"}</Link>
                <span className={styles.hint}>{new Date(entry.openedAt).toLocaleDateString("en-GB")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** A still life of the app: loose accounts on the left, sorted groups on the right. */
function SortingPreview() {
  const groups = [
    { name: "Close friends", color: GROUP_COLORS[0].hex, members: ["ema.k", "tomas_b", "lucia.v"] },
    { name: "Climbing crew", color: GROUP_COLORS[1].hex, members: ["boulder.jano", "ema.k"] },
    { name: "Work", color: GROUP_COLORS[3].hex, members: ["inqool", "martin.dev"] },
  ];

  return (
    <div className={styles.preview} aria-hidden="true">
      {groups.map((group, index) => (
        <div
          key={group.name}
          className={styles.previewGroup}
          style={{ "--group": group.color, "--tilt": `${(index - 1) * 1.5}deg` } as CSSProperties}
        >
          <span className={styles.previewGroupName}>{group.name}</span>
          <span className={styles.previewCount}>{group.members.length}</span>
          <div className={styles.previewMembers}>
            {group.members.map((username) => (
              <span key={username} className={styles.previewChip}>
                <Avatar username={username} size={24} />
                {username}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
