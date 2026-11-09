import { z } from "zod";
import { USERNAME_PATTERN } from "./usernames";

/**
 * Request schemas and response types shared by the API routes and the React client.
 */

const usernameSchema = z.string().regex(USERNAME_PATTERN, "is not a valid Instagram username");

export const exportEntrySchema = z.object({
  username: usernameSchema,
  /** Unix seconds from the export, when Instagram included it. */
  since: z.number().int().nonnegative().nullable(),
});

export const importPayloadSchema = z.object({
  ownerUsername: usernameSchema.nullish(),
  followers: z.array(exportEntrySchema).max(200_000),
  following: z.array(exportEntrySchema).max(200_000),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "is required").max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "must be a hex color like #6f9e7f"),
});

export const updateGroupSchema = createGroupSchema
  .partial()
  .refine((value) => value.name !== undefined || value.color !== undefined, {
    message: "Provide a name or a color to change.",
  });

export type ExportEntry = z.infer<typeof exportEntrySchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export interface AccountView {
  username: string;
  followsMe: boolean;
  followedByMe: boolean;
  followsMeSince: string | null;
  followedByMeSince: string | null;
  avatarUrl: string | null;
}

export interface GroupView {
  id: number;
  name: string;
  color: string;
  /** Usernames, alphabetically. */
  members: string[];
}

export interface WorkspaceView {
  id: string;
  ownerUsername: string | null;
  importedAt: string;
  accounts: AccountView[];
  groups: GroupView[];
}

/** Error body returned by every API route (RFC 9457 problem details). */
export interface Problem {
  status: number;
  title: string;
  detail: string;
}
