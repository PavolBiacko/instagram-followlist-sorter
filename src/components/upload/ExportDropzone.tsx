"use client";

import { useId, useState, type DragEvent } from "react";
import { Icon } from "../Icon";
import styles from "./ExportDropzone.module.css";

interface ExportDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function ExportDropzone({ files, onChange, disabled }: ExportDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const byName = new Map(files.map((file) => [file.name, file]));
    for (const file of Array.from(incoming)) byName.set(file.name, file);
    onChange([...byName.values()]);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`${styles.zone} ${isDragging ? styles.dragging : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.icon}>
          <Icon name="upload" size={22} />
        </span>
        <span className={styles.title}>Drop your Instagram export here</span>
        <span className={styles.hint}>The ZIP from Instagram, or followers_1.json and following.json</span>
        <span className="button">Choose files</span>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept=".zip,.json,application/zip,application/json"
          multiple
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className={styles.files} aria-label="Chosen files">
          {files.map((file) => (
            <li key={file.name}>
              <Icon name="file" size={16} />
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatSize(file.size)}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((f) => f !== file))}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
