import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link callback. Exchanges the code for a session, ensures the
 * authenticated user has a corresponding organizer row, then redirects.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  // Ensure the organizer record exists (first-login bootstrap)
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    const admin = createAdminSupabase();
    const { data: existing } = await admin
      .from("organizers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!existing) {
      // Try to attach by email-derived placeholder phone (organizer can edit later)
      // We store auth_user_id as the link of record.
      await admin.from("organizers").insert({
        auth_user_id: user.id,
        name: user.email.split("@")[0],
        // Placeholder phone — bank details + real phone go on /dashboard/settings
        phone: `PENDING_${user.id.slice(0, 8)}`,
        email: user.email,
      });
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}
