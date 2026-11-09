"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { WorkspaceView } from "@/lib/contracts";
import { RELATION_FILTERS } from "@/lib/relations";
import { useGroupIndex } from "@/lib/workspace-queries";
import { useCurrentWorkspace } from "../workspace/WorkspaceContext";
import styles from "./StatsView.module.css";

const TILE_FILTERS = ["followers", "following", "mutual", "not-following-back", "fans"] as const;

interface BarRow {
  id: number;
  name: string;
  color: string;
  count: number;
  mutual: number;
}

export function StatsView() {
  const workspace = useCurrentWorkspace();
  const { groupsByUsername } = useGroupIndex(workspace);
  const stats = useMemo(() => computeStats(workspace, groupsByUsername), [workspace, groupsByUsername]);

  return (
    <div className={styles.page}>
      <section aria-labelledby="lists-title">
        <h2 id="lists-title" className={styles.sectionTitle}>
          Your lists
        </h2>
        <dl className={styles.tiles}>
          {stats.tiles.map((tile) => (
            <div key={tile.label} className={styles.tile}>
              <dt>{tile.label}</dt>
              <dd className={styles.tileValue}>{tile.value.toLocaleString("en")}</dd>
              <dd className={styles.tileShare}>{percent(tile.value, stats.total)} of everyone</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="groups-chart-title" className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 id="groups-chart-title" className={styles.sectionTitle}>
            People per group
          </h2>
          <p className={styles.note}>
            {stats.grouped.toLocaleString("en")} of {stats.total.toLocaleString("en")} people are in at least one group
            {stats.inSeveral > 0 && `, ${stats.inSeveral.toLocaleString("en")} of them in more than one`}.{" "}
            {stats.total - stats.grouped > 0 && `${(stats.total - stats.grouped).toLocaleString("en")} aren’t sorted yet.`}
          </p>
        </div>

        {stats.bars.length === 0 ? (
          <p className={styles.note}>Create groups in the Overview to see how they compare.</p>
        ) : (
          <GroupBars rows={stats.bars} total={stats.total} />
        )}
      </section>
    </div>
  );
}

function GroupBars({ rows, total }: { rows: BarRow[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <>
      <ul className={styles.bars}>
        {rows.map((row) => (
          <li
            key={row.id}
            className={styles.barRow}
            tabIndex={0}
            onMouseEnter={() => setHovered(row.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(row.id)}
            onBlur={() => setHovered(null)}
          >
            <span className={styles.barLabel}>
              <span className={styles.swatch} style={{ background: row.color }} />
              {row.name}
            </span>
            <span className={styles.track} style={{ "--share": row.count / max } as CSSProperties}>
              <span className={styles.bar} />
              {hovered === row.id && (
                <span
                  className={`${styles.tooltip} ${row.count / max > 0.6 ? styles.tooltipFlipped : ""}`}
                  role="tooltip"
                >
                  <strong>{row.name}</strong>
                  <span>
                    {row.count.toLocaleString("en")} {row.count === 1 ? "person" : "people"}, {percent(row.count, total)} of
                    everyone
                  </span>
                  <span>{row.mutual.toLocaleString("en")} mutual follows</span>
                </span>
              )}
            </span>
            <span className={styles.barValue}>{row.count.toLocaleString("en")}</span>
          </li>
        ))}
      </ul>

      <table className="visually-hidden">
        <caption>People per group</caption>
        <thead>
          <tr>
            <th>Group</th>
            <th>People</th>
            <th>Mutual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.count}</td>
              <td>{row.mutual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function computeStats(workspace: WorkspaceView, groupsByUsername: Map<string, unknown[]>) {
  const { accounts, groups } = workspace;
  const isMutual = new Set(accounts.filter((a) => a.followsMe && a.followedByMe).map((a) => a.username));

  const tiles = TILE_FILTERS.map((id) => {
    const filter = RELATION_FILTERS.find((f) => f.id === id)!;
    return { label: filter.label, value: accounts.filter(filter.matches).length };
  });

  const grouped = accounts.filter((a) => groupsByUsername.has(a.username)).length;
  const inSeveral = accounts.filter((a) => (groupsByUsername.get(a.username)?.length ?? 0) > 1).length;
  const bars: BarRow[] = groups
    .map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
      count: group.members.length,
      mutual: group.members.filter((username) => isMutual.has(username)).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { total: accounts.length, tiles, grouped, inSeveral, bars };
}

function percent(part: number, total: number): string {
  if (total === 0) return "0%";
  const value = (part / total) * 100;
  return `${value > 0 && value < 1 ? "<1" : Math.round(value)}%`;
}
