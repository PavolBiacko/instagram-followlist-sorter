"use client";

import { useDraggable } from "@dnd-kit/core";
import { memo, useState } from "react";
import type { AccountView, GroupView } from "@/lib/contracts";
import { relationLabel } from "@/lib/relations";
import { profileUrl } from "@/lib/usernames";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { Popover } from "../Popover";
import styles from "./AccountRow.module.css";
import { accountDragId, type DragData } from "./drag";
import { MembershipMenu } from "./MembershipMenu";

interface AccountRowProps {
  account: AccountView;
  memberships: GroupView[];
}

export const AccountRow = memo(function AccountRow({ account, memberships }: AccountRowProps) {
  const { username } = account;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: accountDragId(username),
    data: { username } satisfies DragData,
  });

  const toggleMenu = (anchor: HTMLElement) => setMenuAnchor((current) => (current ? null : anchor));
  const groupCount = memberships.length;

  return (
    <div className={`${styles.row} ${isDragging ? styles.dragging : ""}`}>
      <div
        ref={setNodeRef}
        className={styles.handle}
        {...listeners}
        {...attributes}
        aria-roledescription="draggable account"
        aria-label={`@${username}. Drag to a group.`}
      >
        <Avatar username={username} avatarUrl={account.avatarUrl} size={36} />
        <span className={styles.text}>
          <span className={styles.username}>{username}</span>
          <span className={styles.meta}>
            {relationLabel(account)}
            {memberships.slice(0, 4).map((group) => (
              <span key={group.id} className={styles.dot} style={{ background: group.color }} title={group.name} />
            ))}
          </span>
        </span>
      </div>

      {groupCount > 0 && (
        <button
          type="button"
          className={styles.badge}
          aria-label={`In ${groupCount} ${groupCount === 1 ? "group" : "groups"}. Show groups.`}
          aria-expanded={menuAnchor !== null}
          onClick={(event) => toggleMenu(event.currentTarget)}
        >
          {groupCount}
        </button>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className="icon-button"
          aria-label={`Choose groups for @${username}`}
          onClick={(event) => toggleMenu(event.currentTarget)}
        >
          <Icon name="folderPlus" size={17} />
        </button>
        <a
          className="icon-button"
          href={profileUrl(username)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open @${username} on Instagram`}
        >
          <Icon name="external" size={16} />
        </a>
      </div>

      {menuAnchor && (
        <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)} label={`Groups for @${username}`}>
          <MembershipMenu username={username} />
        </Popover>
      )}
    </div>
  );
});
