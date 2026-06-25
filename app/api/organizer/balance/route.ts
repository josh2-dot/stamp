import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BalanceSummary } from "@/types";

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

  if (!organizer) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const { data, error } = await admin.rpc("organizer_balance_summary", {
    p_organizer_id: organizer.id,
  });

  if (error) {
    console.error("[balance] rpc failed", error);
    return NextResponse.json({ error: "Couldn't compute balance" }, { status: 500 });
  }

  // RPC returns a set; we want the single row
  const row = Array.isArray(data) ? data[0] : data;
  const summary: BalanceSummary = {
    earned: Number(row?.earned ?? 0),
    available: Number(row?.available ?? 0),
    in_flight: Number(row?.in_flight ?? 0),
    paid_out: Number(row?.paid_out ?? 0),
  };

  return NextResponse.json(summary);
}
