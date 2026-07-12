"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Desktop max-width. Mobile is always full-width edge-to-edge. */
  maxWidth?: "sm" | "md" | "lg" | "xl";
  /** When false, backdrop clicks and Escape are ignored (in-flight ops). */
  dismissible?: boolean;
  /** For screen readers when sheet content doesn't include a visible title. */
  ariaLabel?: string;
}

const widthClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

/**
 * Dialog wrapper that shape-shifts by viewport:
 *
 *   Mobile (< sm): edge-to-edge bottom sheet, rises from below, home-
 *   indicator safe-area padded, rounded top corners only.
 *
 *   Desktop (≥ sm): centered modal with the previous max-width, gentle
 *   scale-in.
 *
 * Consumers own the sheet's contents. This wrapper handles: backdrop,
 * positioning, animation, scroll lock, keyboard dismissal, focus.
 */
export function Sheet({
  open,
  onClose,
  children,
  maxWidth = "md",
  dismissible = true,
  ariaLabel,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, dismissible]);

  // Lock body scroll while open — otherwise iOS Safari lets the page
  // underneath scroll when the user swipes on the backdrop.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && dismissible) onClose();
  };
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape" && dismissible) {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-50 flex justify-center",
        "items-end sm:items-center",
        // Ink-through-vellum backdrop — cream product means we can't
        // fall back on black/70; that just reads as grey.
        "bg-[rgba(20,16,12,0.55)] backdrop-blur-[6px] animate-backdrop-in",
      )}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full outline-none",
          widthClass[maxWidth],
          // Cap height so a strip of backdrop peeks above the sheet on
          // mobile (visual anchor for "this is dismissible"). Sheet
          // owns scroll — long forms don't push the page.
          "max-h-[92dvh] sm:max-h-[86dvh] overflow-y-auto overscroll-contain",
          "rounded-t-2xl sm:rounded-md",
          "bg-stamp-surface border border-stamp-border shadow-stamp-card",
          "pb-safe sm:pb-0",
          "animate-sheet-in sm:animate-modal-in origin-bottom sm:origin-center",
        )}
      >
        {/* Drag handle — visual affordance that this is dismissible on mobile */}
        {dismissible && (
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div
              className="w-10 h-1 rounded-full bg-stamp-border"
              aria-hidden="true"
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
