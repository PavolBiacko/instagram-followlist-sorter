"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState, type CSSProperties, type FormEvent } from "react";
import type { GroupView } from "@/lib/contracts";
import { useGroupActions } from "@/lib/workspace-queries";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { Popover } from "../Popover";
import { ColorSwatches } from "./ColorSwatches";
import { groupDropId, memberDragId, type DragData, type DropData } from "./drag";
import styles from "./GroupCard.module.css";

interface GroupCardProps {
  workspaceId: string;
  group: GroupView;
}

export function GroupCard({ workspaceId, group }: GroupCardProps) {
  const { setMembership } = useGroupActions(workspaceId);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { setNodeRef, isOver, active } = useDroppable({
    id: groupDropId(group.id),
    data: { groupId: group.id } satisfies DropData,
  });

  const draggedUsername = (active?.data.current as DragData | undefined)?.username;
  const alreadyMember = draggedUsername !== undefined && group.members.includes(draggedUsername);
  const count = group.members.length;

  return (
    <article
      ref={setNodeRef}
      className={`${styles.card} ${isOver ? (alreadyMember ? styles.overTaken : styles.over) : ""}`}
      style={{ "--group": group.color } as CSSProperties}
      aria-label={`${group.name}, ${count} ${count === 1 ? "person" : "people"}`}
    >
      <header className={styles.header}>
        <h3 className={styles.name}>{group.name}</h3>
        <span className={styles.count}>{count}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={`Edit ${group.name}`}
          aria-expanded={menuAnchor !== null}
          onClick={(event) => setMenuAnchor(menuAnchor ? null : event.currentTarget)}
        >
          <Icon name="more" size={18} />
        </button>
      </header>

      {count === 0 ? (
        <p className={styles.empty}>Drag people here</p>
      ) : (
        <ul className={styles.members}>
          {group.members.map((username) => (
            <MemberChip
              key={username}
              groupId={group.id}
              username={username}
              onRemove={() => setMembership.mutate({ groupId: group.id, username, isMember: false })}
            />
          ))}
        </ul>
      )}

      {isOver && alreadyMember && <p className={styles.dropNote}>Already in this group</p>}

      {menuAnchor && (
        <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)} label={`Edit ${group.name}`} width={270}>
          <GroupMenu workspaceId={workspaceId} group={group} onDone={() => setMenuAnchor(null)} />
        </Popover>
      )}
    </article>
  );
}

function MemberChip({ groupId, username, onRemove }: { groupId: number; username: string; onRemove: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: memberDragId(groupId, username),
    data: { username, fromGroupId: groupId } satisfies DragData,
  });

  return (
    <li className={`${styles.member} ${isDragging ? styles.memberDragging : ""}`}>
      <span
        ref={setNodeRef}
        className={styles.memberHandle}
        {...listeners}
        {...attributes}
        aria-roledescription="draggable account"
        aria-label={`@${username}. Drag to another group.`}
      >
        <Avatar username={username} size={26} />
        <span className={styles.memberName}>{username}</span>
      </span>
      <button type="button" className={styles.remove} aria-label={`Remove @${username}`} onClick={onRemove}>
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

function GroupMenu({ workspaceId, group, onDone }: { workspaceId: string; group: GroupView; onDone: () => void }) {
  const { updateGroup, deleteGroup } = useGroupActions(workspaceId);
  const [name, setName] = useState(group.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rename = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== group.name) updateGroup.mutate({ groupId: group.id, input: { name: trimmed } });
    onDone();
  };

  return (
    <div className={styles.menu}>
      <form onSubmit={rename} className={styles.renameForm}>
        <label className={styles.menuLabel} htmlFor={`group-name-${group.id}`}>
          Name
        </label>
        <input
          id={`group-name-${group.id}`}
          className="text-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
        />
        <button type="submit" className="button" disabled={!name.trim()}>
          Save name
        </button>
      </form>

      <div>
        <span className={styles.menuLabel}>Color</span>
        <ColorSwatches value={group.color} onChange={(color) => updateGroup.mutate({ groupId: group.id, input: { color } })} />
      </div>

      <div className={styles.deleteRow}>
        {confirmingDelete ? (
          <>
            <span>Delete “{group.name}”? People stay in your lists.</span>
            <button type="button" className="button button-danger" onClick={() => deleteGroup.mutate(group.id)}>
              Delete group
            </button>
          </>
        ) : (
          <button type="button" className="button button-ghost" onClick={() => setConfirmingDelete(true)}>
            <Icon name="trash" size={15} />
            Delete group
          </button>
        )}
      </div>
    </div>
  );
}
