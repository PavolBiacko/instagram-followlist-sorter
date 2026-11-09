/** Instagram usernames: up to 30 letters, digits, dots and underscores, case-insensitive. */
export const USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/;

/** Canonical lowercase form, or null when the value isn't a valid username. */
export function normalizeUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const candidate = raw.trim().toLowerCase().replace(/^@/, "");
  return USERNAME_PATTERN.test(candidate) ? candidate : null;
}

export function profileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}
