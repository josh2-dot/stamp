import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getEffectiveFees, getPlatformFees } from "@/lib/fee-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the current platform fee config the caller should see.
 *
 *  - Unauthenticated requests get the platform default (used on public
 *    pages, /pricing copy, anonymous browsing of /admin contexts).
 *  - Authenticated organizers get their effective rates — which is their
 *    override if set, otherwise the platform default. This means the
 *    PayoutPreview UI in /dashboard/new and /dashboard/events/[id]/edit
 *    automatically shows organizer-specific math when an override exists,
 *    without the client knowing or caring.
 *
 *  - The `overridden` flag lets the form add a small "Your custom rate"
 *    label without an extra query.
 */
export async function GET() {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (user?.id) {
    // Find this user's organizer record
    const admin = createAdminSupabase();
    const { data: organizer } = await admin
      .from("organizers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (organizer) {
      const { base, rate, overridden } = await getEffectiveFees(organizer.id);
      return NextResponse.json({
        fee_base_kobo: base,
        fee_rate_bps: rate,
        overridden,
      });
    }
  }

  const { base, rate } = await getPlatformFees();
  return NextResponse.json({
    fee_base_kobo: base,
    fee_rate_bps: rate,
    overridden: false,
  });
}
