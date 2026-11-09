import { GROUP_COLORS } from "@/lib/group-colors";
import styles from "./ColorSwatches.module.css";

interface ColorSwatchesProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Group color">
      {GROUP_COLORS.map((color) => (
        <button
          key={color.hex}
          type="button"
          role="radio"
          aria-checked={value === color.hex}
          aria-label={color.name}
          title={color.name}
          className={styles.swatch}
          style={{ background: color.hex }}
          onClick={() => onChange(color.hex)}
        />
      ))}
    </div>
  );
}
