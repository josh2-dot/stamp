import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns whether the current signed-in user is the organizer of this event.
 * Used by the dashboard page to verify access before subscribing to realtime.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ owned: false }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!organizer) return NextResponse.json({ owned: false }, { status: 403 });

  const { data: event } = await admin
    .from("events")
    .select("id")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  return NextResponse.json({ owned: !!event });
}
