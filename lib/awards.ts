import "server-only";

/**
 * Awards V1 phase machinery.
 *
 * Phases on award_categories advance only via explicit organizer action
 * (POST /api/awards/categories/[id]/advance). No automatic time-based
 * transitions for V1 — the organizer is in control and we don't need a
 * cron worker. Their UI shows "Open nominations →" / "Close nominations →"
 * / "Open voting →" / "Close voting →" / "Reveal winners →" buttons
 * matching the current phase.
 */

export type AwardPhase =
  | "draft"
  | "nominations_open"
  | "moderation"
  | "voting_open"
  | "voting_closed"
  | "revealed";

const ORDER: AwardPhase[] = [
  "draft",
  "nominations_open",
  "moderation",
  "voting_open",
  "voting_closed",
  "revealed",
];

export function nextPhase(current: AwardPhase): AwardPhase | null {
  const idx = ORDER.indexOf(current);
  if (idx < 0 || idx >= ORDER.length - 1) return null;
  return ORDER[idx + 1] ?? null;
}

/**
 * Whether an organizer can advance from `current` to `target` directly.
 * Only forward transitions, one step at a time. No skipping (you must
 * close voting before revealing) and no rewinding (once voting opens, no
 * going back to moderation — votes already exist).
 */
export function canAdvanceTo(current: AwardPhase, target: AwardPhase): boolean {
  return nextPhase(current) === target;
}

export function isNominationsOpen(phase: AwardPhase): boolean {
  return phase === "nominations_open";
}

export function isVotingOpen(phase: AwardPhase): boolean {
  return phase === "voting_open";
}

export function isRevealed(phase: AwardPhase): boolean {
  return phase === "revealed";
}

/**
 * Public-facing label for a phase. Used on category cards on the public
 * event page so visitors know whether to nominate, vote, or wait.
 */
export function phaseLabel(phase: AwardPhase): string {
  switch (phase) {
    case "draft":
      return "Setting up";
    case "nominations_open":
      return "Nominations open";
    case "moderation":
      return "Reviewing nominations";
    case "voting_open":
      return "Voting open";
    case "voting_closed":
      return "Voting closed";
    case "revealed":
      return "Winner revealed";
  }
}

/** Normalize a Nigerian phone number for stable nominator/voter identity */
export function normalizeNgPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+234${digits}`;
  return null;
}

/**
 * Build the Paystack callback URL for an award vote. Lands on the public
 * voting page with a `vote_ref` query param so the page can render a
 * "thanks, your X votes for Y are confirmed" state.
 */
export function awardsVoteCallbackUrl(eventSlug: string, ref: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/${eventSlug}/awards?vote_ref=${ref}`;
}
