"use client";

import type { GroupView } from "@/lib/contracts";
import styles from "./GroupBoard.module.css";
import { GroupCard } from "./GroupCard";
import { NewGroupForm } from "./NewGroupForm";

export function GroupBoard({ workspaceId, groups }: { workspaceId: string; groups: GroupView[] }) {
  return (
    <section className={styles.board} aria-labelledby="groups-title">
      <div className={styles.header}>
        <div>
          <h2 id="groups-title" className={styles.title}>
            Groups
          </h2>
          <p className={styles.hint}>
            Drag people from the list into a group. One person can be in several groups.
          </p>
        </div>
        <NewGroupForm workspaceId={workspaceId} usedColors={groups.map((g) => g.color)} />
      </div>

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <h3>Start with your first group</h3>
          <p>Name it after how you know people: Close friends, Family, Work, Climbing crew.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {groups.map((group) => (
            <GroupCard key={group.id} workspaceId={workspaceId} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}
