import type { CSSProperties } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: number;
}

/**
 * Instagram's export has no profile photos, so accounts get a stable, generated avatar:
 * initials on a soft tone derived from the username. A real photo is used when one is known.
 */
export function Avatar({ username, avatarUrl, size = 36 }: AvatarProps) {
  const style = { "--size": `${size}px`, "--hue": hueFor(username) } as CSSProperties;

  if (avatarUrl) {
    return <img className={styles.avatar} style={style} src={avatarUrl} alt="" />;
  }
  return (
    <span className={styles.avatar} style={style} aria-hidden="true">
      {initialsFor(username)}
    </span>
  );
}

function initialsFor(username: string): string {
  const parts = username.split(/[._]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : username.replace(/[._]/g, "").slice(0, 2);
  return (letters || "?").toUpperCase();
}

function hueFor(username: string): number {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}
