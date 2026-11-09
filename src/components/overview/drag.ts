/** Data attached to everything that can be dragged onto a group. */
export interface DragData {
  username: string;
  /** Set when the drag started inside a group card. */
  fromGroupId?: number;
}

export interface DropData {
  groupId: number;
}

export const accountDragId = (username: string) => `account:${username}`;
export const memberDragId = (groupId: number, username: string) => `member:${groupId}:${username}`;
export const groupDropId = (groupId: number) => `group:${groupId}`;
