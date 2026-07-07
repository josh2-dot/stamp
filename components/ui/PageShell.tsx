import type { ReactNode } from "react";
import { TopNav } from "@/components/landing/TopNav";
import { cn } from "@/lib/cn";

type MaxWidth = "sm" | "md" | "lg" | "xl";

interface PageShellProps {
  children: ReactNode;
  /**
   * Constrain content width:
   *   sm  → max-w-md   (login, narrow forms)
   *   md  → max-w-2xl  (success, single-column flows)
   *   lg  → max-w-3xl  (settings, payouts, new event)
   *   xl  → max-w-6xl  (dashboard, event page, marketing)
   */
  maxWidth?: MaxWidth;
  /** Render the TopNav (default true) */
  nav?: boolean;
  /** Add className overrides to <main> */
  className?: string;
}

const widthClass: Record<MaxWidth, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
};

/**
 * Standard logged-in / marketing page wrapper.
 *
 * Owns the consistent top-padding rhythm (pt-32 pb-24) and max-width container.
 * Use this for every page above the fold — anything bypassing it should be a
 * deliberate exception (e.g. /scan, which is fullscreen camera).
 */
export function PageShell({
  children,
  maxWidth = "xl",
  nav = true,
  className,
}: PageShellProps) {
  return (
    <>
      {nav && <TopNav />}
      <main
        id="main"
        // scroll-mt-32 keeps the TopNav from covering content when a
        // hash link (or skip-to-content) jumps here.
        className={cn(
          widthClass[maxWidth],
          "mx-auto px-6 pt-32 pb-24 scroll-mt-32",
          className,
        )}
      >
        {children}
      </main>
    </>
  );
}
