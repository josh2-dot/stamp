import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!organizer) return NextResponse.json({ withdrawals: [] });

  const { data } = await admin
    .from("withdrawals")
    .select(
      "id, amount, status, paystack_reference, failure_reason, requested_at, completed_at",
    )
    .eq("organizer_id", organizer.id)
    .order("requested_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ withdrawals: data ?? [] });
}
