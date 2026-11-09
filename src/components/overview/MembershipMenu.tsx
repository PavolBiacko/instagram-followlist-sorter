"use client";

import type { CSSProperties } from "react";
import { useGroupActions } from "@/lib/workspace-queries";
import { Icon } from "../Icon";
import { useCurrentWorkspace } from "../workspace/WorkspaceContext";
import styles from "./MembershipMenu.module.css";

/** Checklist of all groups for one account. Also the way to sort people without dragging. */
export function MembershipMenu({ username }: { username: string }) {
  const workspace = useCurrentWorkspace();
  const { setMembership } = useGroupActions(workspace.id);

  return (
    <div className={styles.menu}>
      <p className={styles.heading}>Groups for @{username}</p>
      {workspace.groups.length === 0 ? (
        <p className={styles.empty}>No groups yet. Create one in the Groups panel.</p>
      ) : (
        <ul>
          {workspace.groups.map((group) => {
            const isMember = group.members.includes(username);
            return (
              <li key={group.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isMember}
                  className={styles.option}
                  style={{ "--group": group.color } as CSSProperties}
                  onClick={() => setMembership.mutate({ groupId: group.id, username, isMember: !isMember })}
                >
                  <span className={styles.check}>{isMember && <Icon name="check" size={13} />}</span>
                  <span className={styles.name}>{group.name}</span>
                  <span className={styles.count}>{group.members.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
