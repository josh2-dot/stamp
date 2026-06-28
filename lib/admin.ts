import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Admin access control for /admin/*.
 *
 * Email-based allowlist via the ADMIN_EMAILS env var (comma-separated).
 * Cleaner than a DB column for STAMP's stage — granting/revoking is a
 * Vercel env edit, no SQL involved. Migrate to a column-based system
 * later if/when more roles emerge.
 */

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Resolve the current signed-in admin, if any. Returns null when the user
 * isn't signed in OR isn't on the allowlist. Server-component / route-handler
 * use only.
 */
export async function getCurrentAdmin(): Promise<{
  userId: string;
  email: string;
} | null> {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.email) return null;
  if (!isAdminEmail(user.email)) return null;

  return { userId: user.id, email: user.email };
}

/**
 * Record an admin write action. Every mutation under /admin/* should
 * call this so the audit log captures who did what.
 */
export async function logAdminAction(params: {
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}): Promise<void> {
  try {
    const admin = createAdminSupabase();
    await admin.from("admin_audit_log").insert({
      actor_email: params.actorEmail,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      note: params.note ?? null,
    });
  } catch (err) {
    // Logging failures are never fatal — the underlying action still happened.
    // Surface them as warnings so they show up in Vercel logs.
    console.error("[admin] audit log write failed", err, params);
  }
}
