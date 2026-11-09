import type { AccountView } from "./contracts";

export const RELATION_FILTERS = [
  { id: "all", label: "Everyone", matches: () => true },
  { id: "followers", label: "Followers", matches: (a: AccountView) => a.followsMe },
  { id: "following", label: "Following", matches: (a: AccountView) => a.followedByMe },
  { id: "mutual", label: "Mutual", matches: (a: AccountView) => a.followsMe && a.followedByMe },
  { id: "not-following-back", label: "Not following back", matches: (a: AccountView) => a.followedByMe && !a.followsMe },
  { id: "fans", label: "You don't follow", matches: (a: AccountView) => a.followsMe && !a.followedByMe },
] as const;

export type RelationFilterId = (typeof RELATION_FILTERS)[number]["id"];

export function relationLabel(account: AccountView): string {
  if (account.followsMe && account.followedByMe) return "Mutual";
  return account.followsMe ? "Follows you" : "You follow";
}
