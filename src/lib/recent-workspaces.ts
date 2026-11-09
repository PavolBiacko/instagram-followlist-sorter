/** Remembers recently opened workspaces in this browser, since there is no account to list them. */

export interface RecentWorkspace {
  id: string;
  ownerUsername: string | null;
  openedAt: string;
}

const STORAGE_KEY = "followlist:recent-workspaces";
const LIMIT = 5;

export function readRecentWorkspaces(): RecentWorkspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberWorkspace(id: string, ownerUsername: string | null) {
  const others = readRecentWorkspaces().filter((entry) => entry.id !== id);
  write([{ id, ownerUsername, openedAt: new Date().toISOString() }, ...others].slice(0, LIMIT));
}

export function forgetWorkspace(id: string) {
  write(readRecentWorkspaces().filter((entry) => entry.id !== id));
}

function write(entries: RecentWorkspace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable (private mode, quota); the list is only a convenience.
  }
}
