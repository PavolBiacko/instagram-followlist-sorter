import { strFromU8, unzipSync } from "fflate";
import type { ExportEntry } from "./contracts";
import { normalizeUsername } from "./usernames";

/**
 * Reads the "Followers and following" part of an Instagram data export (JSON format).
 * Runs in the browser, so only the extracted usernames are sent to the server.
 *
 * Known shapes:
 *   followers_1.json, followers_2.json, ...  →  [ { title, string_list_data: [{ href, value, timestamp }] } ]
 *   following.json                           →  { relationships_following: [ same entry shape ] }
 * Newer exports moved the username from string_list_data[0].value to title, so both are read.
 */

export interface ParsedExport {
  followers: ExportEntry[];
  following: ExportEntry[];
}

export class ExportError extends Error {}

const FOLLOWERS_FILE = /^followers(_\d+)?\.(json|html)$/;
const FOLLOWING_FILE = /^following\.(json|html)$/;

export async function parseExportFiles(files: File[]): Promise<ParsedExport> {
  const collector = new ExportCollector();

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".zip")) {
      readZip(new Uint8Array(await file.arrayBuffer()), collector);
    } else if (name.endsWith(".json")) {
      collector.addJson(file.name, await file.text(), { strict: true });
    } else if (name.endsWith(".html")) {
      throw htmlExportError();
    } else {
      throw new ExportError(`"${file.name}" isn't a ZIP or JSON file. Upload the export from Instagram.`);
    }
  }

  return collector.result();
}

function readZip(bytes: Uint8Array, collector: ExportCollector) {
  let entries: Record<string, Uint8Array>;
  try {
    // The filter runs before decompression, so the rest of a large export is skipped cheaply.
    entries = unzipSync(bytes, { filter: (entry) => isRelationshipFile(entry.name) });
  } catch {
    throw new ExportError("The ZIP file can't be opened. Download it again from Instagram.");
  }

  for (const [path, content] of Object.entries(entries)) {
    if (path.toLowerCase().endsWith(".html")) {
      collector.markHtmlFound();
      continue;
    }
    collector.addJson(path, strFromU8(content), { strict: false });
  }
}

function isRelationshipFile(path: string): boolean {
  const fileName = path.split("/").pop()?.toLowerCase() ?? "";
  return FOLLOWERS_FILE.test(fileName) || FOLLOWING_FILE.test(fileName);
}

class ExportCollector {
  private followers = new Map<string, ExportEntry>();
  private following = new Map<string, ExportEntry>();
  private foundList = false;
  private foundHtml = false;

  addJson(fileName: string, text: string, { strict }: { strict: boolean }) {
    let root: unknown;
    try {
      root = JSON.parse(text);
    } catch {
      throw new ExportError(`"${baseName(fileName)}" isn't valid JSON.`);
    }

    if (Array.isArray(root)) {
      this.foundList = true;
      addEntries(root, this.followers);
    } else if (isRecord(root) && Array.isArray(root.relationships_following)) {
      this.foundList = true;
      addEntries(root.relationships_following, this.following);
    } else if (strict) {
      throw new ExportError(
        `"${baseName(fileName)}" doesn't look like a followers or following file from Instagram.`,
      );
    }
  }

  markHtmlFound() {
    this.foundHtml = true;
  }

  result(): ParsedExport {
    if (!this.foundList) {
      if (this.foundHtml) throw htmlExportError();
      throw new ExportError(
        'No followers or following lists found. Make sure the export includes "Followers and following" in JSON format.',
      );
    }
    return { followers: [...this.followers.values()], following: [...this.following.values()] };
  }
}

function addEntries(items: unknown[], target: Map<string, ExportEntry>) {
  for (const item of items) {
    const entry = toEntry(item);
    if (entry && !target.has(entry.username)) {
      target.set(entry.username, entry);
    }
  }
}

function toEntry(item: unknown): ExportEntry | null {
  if (!isRecord(item)) return null;
  const data = Array.isArray(item.string_list_data) && isRecord(item.string_list_data[0])
    ? item.string_list_data[0]
    : {};

  const username =
    normalizeUsername(asString(data.value)) ??
    normalizeUsername(asString(item.title)) ??
    normalizeUsername(usernameFromHref(asString(data.href)));
  if (!username) return null;

  const timestamp = typeof data.timestamp === "number" && data.timestamp > 0 ? Math.floor(data.timestamp) : null;
  return { username, since: timestamp };
}

/** "https://www.instagram.com/_u/jane.doe" → "jane.doe" */
function usernameFromHref(href: string | null): string | null {
  if (!href) return null;
  try {
    const segments = new URL(href).pathname.split("/").filter((segment) => segment && segment !== "_u");
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

function htmlExportError() {
  return new ExportError("This export is in HTML format. Request a new one from Instagram and choose JSON.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}
