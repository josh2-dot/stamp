import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RejectBody {
  nomination_ids: string[];
}

export async function POST(req: NextRequest) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: RejectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!Array.isArray(body.nomination_ids) || body.nomination_ids.length === 0) {
    return NextResponse.json(
      { error: "Pass one or more nomination_ids" },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) {
    return NextResponse.json({ error: "No organizer profile" }, { status: 403 });
  }

  // Verify ownership by joining through the events table once
  const { data: noms } = await admin
    .from("award_nominations")
    .select("id, event_id, events!inner(organizer_id)")
    .in("id", body.nomination_ids);

  if (!noms || noms.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  for (const n of noms) {
    const ev = Array.isArray(n.events) ? n.events[0] : n.events;
    if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  }

  const { error: updErr } = await admin
    .from("award_nominations")
    .update({ status: "rejected" })
    .in("id", body.nomination_ids);

  if (updErr) {
    return NextResponse.json({ error: "Couldn't reject" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
