import type { ReactNode } from "react";
import { TopNav } from "@/components/landing/TopNav";
import { cn } from "@/lib/cn";

type MaxWidth = "sm" | "md" | "lg" | "xl";

interface PageShellProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  nav?: boolean;
  className?: string;
}

const widthClass: Record<MaxWidth, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
};

/**
 * Standard page wrapper. The TopNav is no longer absolute over the
 * hero — it sits above content on a shared paper ground, so we now
 * add pt-24 (was pt-32) as a straight header offset rather than a
 * "clear the fixed nav" pad.
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
        className={cn(
          widthClass[maxWidth],
          "mx-auto px-6 pt-16 pb-24 scroll-mt-24",
          className,
        )}
      >
        {children}
      </main>
    </>
  );
}
