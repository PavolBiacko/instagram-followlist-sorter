import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** One uploaded export. The random id doubles as the private link, so there is no login. */
export const workspaces = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUsername: varchar("owner_username", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Someone from the owner's followers list, following list, or both. */
export const accounts = pgTable(
  "account",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 30 }).notNull(),
    followsMe: boolean("follows_me").notNull(),
    followedByMe: boolean("followed_by_me").notNull(),
    followsMeSince: timestamp("follows_me_since", { withTimezone: true }),
    followedByMeSince: timestamp("followed_by_me_since", { withTimezone: true }),
    /** Not in the Instagram export. Reserved for a future, legal enrichment source. */
    avatarUrl: varchar("avatar_url", { length: 1024 }),
  },
  (table) => [unique("uq_account_workspace_username").on(table.workspaceId, table.username)],
);

export const groups = pgTable(
  "account_group",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ix_account_group_workspace").on(table.workspaceId)],
);

export const groupMembers = pgTable(
  "group_member",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.accountId] }),
    index("ix_group_member_account").on(table.accountId),
  ],
);
