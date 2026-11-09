"use client";

import { useState, type FormEvent } from "react";
import { nextGroupColor } from "@/lib/group-colors";
import { useGroupActions } from "@/lib/workspace-queries";
import { Popover } from "../Popover";
import { ColorSwatches } from "./ColorSwatches";
import styles from "./NewGroupForm.module.css";

interface NewGroupFormProps {
  workspaceId: string;
  usedColors: string[];
}

export function NewGroupForm({ workspaceId, usedColors }: NewGroupFormProps) {
  const { createGroup } = useGroupActions(workspaceId);
  const [name, setName] = useState("");
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const color = chosenColor ?? nextGroupColor(usedColors);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createGroup.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName("");
          setChosenColor(null);
        },
      },
    );
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <button
        type="button"
        className={styles.colorButton}
        style={{ background: color }}
        aria-label="Choose a color for the new group"
        aria-expanded={colorAnchor !== null}
        onClick={(event) => setColorAnchor(colorAnchor ? null : event.currentTarget)}
      />
      <label className="visually-hidden" htmlFor="new-group-name">
        New group name
      </label>
      <input
        id="new-group-name"
        className="text-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New group name"
        maxLength={60}
      />
      <button type="submit" className="button button-primary" disabled={!name.trim() || createGroup.isPending}>
        Create group
      </button>

      {colorAnchor && (
        <Popover anchor={colorAnchor} onClose={() => setColorAnchor(null)} label="Group color" width={220}>
          <div className={styles.colorPanel}>
            <ColorSwatches
              value={color}
              onChange={(hex) => {
                setChosenColor(hex);
                setColorAnchor(null);
              }}
            />
          </div>
        </Popover>
      )}
    </form>
  );
}
