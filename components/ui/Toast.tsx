"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  tone: Tone;
  title: string;
  body?: string;
  /** Auto-dismiss after this many ms. Default 5000. Use 0 to require manual dismiss. */
  duration?: number;
}

interface ToastContextValue {
  /** Show a toast. Returns the id (so callers can dismiss manually). */
  toast: (item: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lightweight toast system. No library — just a context provider, a stack,
 * and a fixed-position container. Replaces the five `alert()` calls in the
 * Awards V1 surfaces that broke the otherwise-consistent inline error pattern.
 *
 * Tones map to the same Card border colors used elsewhere, so toasts feel
 * like extensions of the system rather than a new visual language.
 *
 * Use the `useToast()` hook inside any client component:
 *
 *   const { toast } = useToast();
 *   toast({ tone: "error", title: "Couldn't promote", body: "Try again." });
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  // Track timers so manual dismiss can clear them
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next: ToastItem = { duration: 5000, ...item, id };
      setItems((prev) => [...prev, next]);
      if (next.duration && next.duration > 0) {
        const timer = setTimeout(() => dismiss(id), next.duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Cleanup all timers on unmount (page navigation, etc.)
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider not mounted — return a no-op so callers don't crash if they
    // somehow render outside the tree. Logs once so it shows up in dev.
    if (typeof window !== "undefined") {
      console.warn("[Toast] useToast called outside ToastProvider");
    }
    return {
      toast: () => "",
      dismiss: () => undefined,
    };
  }
  return ctx;
}

// ============================================================
// Viewport — the fixed-position stack
// ============================================================

const toneStyles: Record<
  Tone,
  { border: string; iconBg: string; iconText: string }
> = {
  success: {
    border: "border-stamp-green/40",
    iconBg: "bg-stamp-green/10",
    iconText: "text-stamp-green",
  },
  error: {
    border: "border-stamp-red/40",
    iconBg: "bg-stamp-red/10",
    iconText: "text-stamp-red",
  },
  warning: {
    border: "border-stamp-gold/40",
    iconBg: "bg-stamp-gold/10",
    iconText: "text-stamp-gold",
  },
  info: {
    border: "border-stamp-border",
    iconBg: "bg-stamp-surface2",
    iconText: "text-stamp-muted-2",
  },
};

const toneIcon: Record<Tone, ReactNode> = {
  // Hand-rolled SVGs (8 lines max) to avoid pulling in an icon library —
  // STAMP intentionally ships zero icon dependency.
  success: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M3.5 8.5 L6.5 11.5 L12.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M8 4 V9 M8 12 V12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M8 4 V9 M8 12 V12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M8 7 V12 M8 4 V4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      // Bottom-right on desktop, bottom-full-width on mobile. Avoids the
      // top-of-page collision with TopNav.
      className="fixed z-50 pointer-events-none inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 flex flex-col-reverse gap-2 max-w-sm sm:max-w-md"
      role="region"
      aria-label="Notifications"
    >
      {items.map((t) => {
        const styles = toneStyles[t.tone];
        return (
          <div
            key={t.id}
            // Inline animation — slides up + fades in. No library.
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-lg border bg-stamp-surface shadow-stamp-card",
              "animate-toast-in",
              styles.border,
            )}
            role={t.tone === "error" ? "alert" : "status"}
          >
            <span
              className={cn(
                "shrink-0 mt-0.5 w-6 h-6 rounded-full grid place-items-center",
                styles.iconBg,
                styles.iconText,
              )}
              aria-hidden="true"
            >
              {toneIcon[t.tone]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stamp-white font-medium">{t.title}</p>
              {t.body && (
                <p className="text-xs text-stamp-muted-2 mt-1">{t.body}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 -mr-1 -mt-1 p-1 rounded text-stamp-muted-2 hover:text-stamp-white transition-colors"
              aria-label="Dismiss notification"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path
                  d="M4 4 L12 12 M12 4 L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
