"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { WorkspaceView } from "@/lib/contracts";
import { useGroupActions, useGroupIndex } from "@/lib/workspace-queries";
import { Avatar } from "../Avatar";
import { useToast } from "../Toast";
import { useCurrentWorkspace } from "../workspace/WorkspaceContext";
import { AccountList } from "./AccountList";
import type { DragData, DropData } from "./drag";
import { GroupBoard } from "./GroupBoard";
import styles from "./Overview.module.css";

export function Overview() {
  const workspace = useCurrentWorkspace();
  const { groupsByUsername } = useGroupIndex(workspace);
  const { setMembership } = useGroupActions(workspace.id);
  const toast = useToast();
  const [dragged, setDragged] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragged((active.data.current as DragData).username);
    // A mouse drag would otherwise select the text it passes over.
    window.getSelection()?.removeAllRanges();
    document.body.classList.add("is-dragging");
  };

  const stopDragging = () => {
    setDragged(null);
    document.body.classList.remove("is-dragging");
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    stopDragging();
    if (!over) return;
    const { username, fromGroupId } = active.data.current as DragData;
    const { groupId } = over.data.current as DropData;
    const group = workspace.groups.find((g) => g.id === groupId);
    if (!group || fromGroupId === groupId) return;

    if (group.members.includes(username)) {
      toast.show(`@${username} is already in ${group.name}.`);
    } else {
      setMembership.mutate({ groupId, username, isMember: true });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={stopDragging}
      accessibility={{ announcements: announcementsFor(workspace) }}
    >
      <div className={styles.layout}>
        <AccountList accounts={workspace.accounts} groupsByUsername={groupsByUsername} />
        <GroupBoard workspaceId={workspace.id} groups={workspace.groups} />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragged && (
          <div className={styles.dragChip}>
            <Avatar username={dragged} size={28} />@{dragged}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function announcementsFor(workspace: WorkspaceView): Announcements {
  const user = (data: unknown) => `@${(data as DragData).username}`;
  const group = (data: unknown) => workspace.groups.find((g) => g.id === (data as DropData).groupId)?.name ?? "a group";
  return {
    onDragStart: ({ active }) => `Picked up ${user(active.data.current)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${user(active.data.current)} is over ${group(over.data.current)}.` : `${user(active.data.current)} is not over a group.`,
    onDragEnd: ({ active, over }) =>
      over ? `Added ${user(active.data.current)} to ${group(over.data.current)}.` : `Dropped ${user(active.data.current)}.`,
    onDragCancel: ({ active }) => `Stopped dragging ${user(active.data.current)}.`,
  };
}
