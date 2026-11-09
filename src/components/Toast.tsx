"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

type Tone = "info" | "error";
interface ToastMessage {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<{ show: (text: string, tone?: Tone) => void } | null>(null);

const VISIBLE_MS = 4000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, tone: Tone = "info") => {
    const id = nextId++;
    setMessages((current) => [...current.slice(-2), { id, text, tone }]);
    setTimeout(() => setMessages((current) => current.filter((m) => m.id !== id)), VISIBLE_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`${styles.toast} ${message.tone === "error" ? styles.error : ""}`}>
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
