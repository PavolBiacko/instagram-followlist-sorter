"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { AccountView, GroupView } from "@/lib/contracts";
import { RELATION_FILTERS, type RelationFilterId } from "@/lib/relations";
import { Icon } from "../Icon";
import styles from "./AccountList.module.css";
import { AccountRow } from "./AccountRow";

const ROW_HEIGHT = 56;
const NO_GROUPS: GroupView[] = [];

interface AccountListProps {
  accounts: AccountView[];
  groupsByUsername: Map<string, GroupView[]>;
}

export function AccountList({ accounts, groupsByUsername }: AccountListProps) {
  const [filterId, setFilterId] = useState<RelationFilterId>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase().replace(/^@/, ""));
  const scrollRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => Object.fromEntries(RELATION_FILTERS.map((f) => [f.id, accounts.filter(f.matches).length])),
    [accounts],
  );

  const visible = useMemo(() => {
    const filter = RELATION_FILTERS.find((f) => f.id === filterId)!;
    return accounts.filter((a) => filter.matches(a) && (!deferredQuery || a.username.includes(deferredQuery)));
  }, [accounts, filterId, deferredQuery]);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filterId, deferredQuery]);

  return (
    <section className={styles.panel} aria-labelledby="accounts-title">
      <div className={styles.toolbar}>
        <h2 id="accounts-title" className={styles.title}>
          People <span className={styles.total}>{accounts.length}</span>
        </h2>

        <label className={styles.search}>
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search by username</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username"
            spellCheck={false}
          />
        </label>

        <div className={styles.filters} role="radiogroup" aria-label="Show">
          {RELATION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="radio"
              aria-checked={filterId === filter.id}
              className={styles.filter}
              onClick={() => setFilterId(filter.id)}
            >
              {filter.label}
              <span className={styles.filterCount}>{counts[filter.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className={styles.scroller}>
        {visible.length === 0 ? (
          <p className={styles.empty}>
            {deferredQuery ? `Nobody matches “${deferredQuery}”.` : "Nobody in this list."}
          </p>
        ) : (
          <div className={styles.rows} style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const account = visible[item.index];
              return (
                <div
                  key={account.username}
                  className={styles.rowSlot}
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                >
                  <AccountRow account={account} memberships={groupsByUsername.get(account.username) ?? NO_GROUPS} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
