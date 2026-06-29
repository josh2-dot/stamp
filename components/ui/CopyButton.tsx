"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

/**
 * Copy-to-clipboard button. Used for share links — scanner link,
 * voting link, nomination link. State resets after 1.5s so it can
 * be clicked multiple times in a session.
 */
export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="px-4 py-3 rounded-md border border-stamp-border bg-stamp-surface2 text-sm text-stamp-white hover:border-stamp-orange transition-colors whitespace-nowrap"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}
