"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Popover.module.css";

interface PopoverProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  label: string;
  children: ReactNode;
  width?: number;
}

const GAP = 6;
const VIEWPORT_MARGIN = 8;

/**
 * A small floating panel anchored to a button. It renders into <body> so scrolling lists
 * don't clip it, and closes on outside click, Escape, or when the page scrolls.
 */
export function Popover({ anchor, onClose, label, children, width = 260 }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !panelRef.current) return;
    const rect = anchor.getBoundingClientRect();
    const panelHeight = panelRef.current.offsetHeight;
    const fitsBelow = rect.bottom + GAP + panelHeight < window.innerHeight - VIEWPORT_MARGIN;
    const top = fitsBelow ? rect.bottom + GAP : Math.max(VIEWPORT_MARGIN, rect.top - GAP - panelHeight);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), window.innerWidth - width - VIEWPORT_MARGIN);
    setPosition({ top, left });
  }, [anchor, width, children]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !anchor?.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        anchor?.focus();
      }
    };
    const onScroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, []);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={styles.panel}
      style={{ width, top: position?.top ?? -9999, left: position?.left ?? -9999 }}
    >
      {children}
    </div>,
    document.body,
  );
}
