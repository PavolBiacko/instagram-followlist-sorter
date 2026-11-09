import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ExportError, parseExportFiles } from "./instagram-export";

const followersJson = JSON.stringify([
  {
    title: "",
    media_list_data: [],
    string_list_data: [{ href: "https://www.instagram.com/Jane.Doe", value: "Jane.Doe", timestamp: 1700000000 }],
  },
  { title: "", string_list_data: [{ href: "https://www.instagram.com/mark_ok", value: "mark_ok", timestamp: 1700000100 }] },
]);

// Newer exports: username lives in `title`, href uses the /_u/ prefix and there is no `value`.
const followingJson = JSON.stringify({
  relationships_following: [
    { title: "jane.doe", string_list_data: [{ href: "https://www.instagram.com/_u/jane.doe", timestamp: 1690000000 }] },
    { title: "", string_list_data: [{ href: "https://www.instagram.com/_u/natgeo" }] },
  ],
});

function file(name: string, content: string | Uint8Array) {
  return new File([content as BlobPart], name);
}

describe("parseExportFiles", () => {
  it("reads followers and following from separate JSON files", async () => {
    const result = await parseExportFiles([file("followers_1.json", followersJson), file("following.json", followingJson)]);

    expect(result.followers).toEqual([
      { username: "jane.doe", since: 1700000000 },
      { username: "mark_ok", since: 1700000100 },
    ]);
    expect(result.following).toEqual([
      { username: "jane.doe", since: 1690000000 },
      { username: "natgeo", since: null },
    ]);
  });

  it("reads the relevant files from a full export ZIP and ignores the rest", async () => {
    const zip = zipSync({
      "connections/followers_and_following/followers_1.json": strToU8(followersJson),
      "connections/followers_and_following/following.json": strToU8(followingJson),
      "connections/followers_and_following/close_friends.json": strToU8('{"relationships_close_friends":[]}'),
      "personal_information/personal_information.json": strToU8("{}"),
    });

    const result = await parseExportFiles([file("instagram-export.zip", zip)]);

    expect(result.followers.map((entry) => entry.username)).toEqual(["jane.doe", "mark_ok"]);
    expect(result.following.map((entry) => entry.username)).toEqual(["jane.doe", "natgeo"]);
  });

  it("merges paged follower files without duplicates", async () => {
    const page2 = JSON.stringify([{ string_list_data: [{ value: "mark_ok" }] }, { string_list_data: [{ value: "zed" }] }]);

    const result = await parseExportFiles([file("followers_1.json", followersJson), file("followers_2.json", page2)]);

    expect(result.followers.map((entry) => entry.username)).toEqual(["jane.doe", "mark_ok", "zed"]);
    expect(result.following).toEqual([]);
  });

  it("explains when the export was made in HTML format", async () => {
    const zip = zipSync({ "connections/followers_and_following/followers_1.html": strToU8("<html></html>") });

    await expect(parseExportFiles([file("export.zip", zip)])).rejects.toThrow(/HTML format/);
  });

  it("rejects JSON that isn't a followers or following list", async () => {
    await expect(parseExportFiles([file("likes.json", '{"likes_media_likes":[]}')])).rejects.toBeInstanceOf(ExportError);
  });

  it("rejects a ZIP without relationship files", async () => {
    const zip = zipSync({ "media/posts.json": strToU8("[]") });

    await expect(parseExportFiles([file("export.zip", zip)])).rejects.toThrow(/No followers or following/);
  });
});
