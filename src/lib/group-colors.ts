/** Muted tones; the UI applies them as soft tints, so groups stay calm next to each other. */
export const GROUP_COLORS = [
  { name: "Sage", hex: "#6f9e7f" },
  { name: "Slate", hex: "#6e86b8" },
  { name: "Rose", hex: "#c07d93" },
  { name: "Ochre", hex: "#c49a45" },
  { name: "Lavender", hex: "#8f7fc0" },
  { name: "Teal", hex: "#5e9ea0" },
  { name: "Clay", hex: "#b8826a" },
  { name: "Stone", hex: "#8a93a3" },
] as const;

/** Suggests the least-used color so new groups look different from existing ones. */
export function nextGroupColor(usedColors: string[]): string {
  const usage = new Map<string, number>(GROUP_COLORS.map((color) => [color.hex, 0]));
  for (const color of usedColors) {
    usage.set(color, (usage.get(color) ?? 0) + 1);
  }
  return GROUP_COLORS.reduce((best, color) =>
    (usage.get(color.hex) ?? 0) < (usage.get(best.hex) ?? 0) ? color : best,
  ).hex;
}
