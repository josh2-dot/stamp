import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { deletePoster, uploadPoster } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { organizer } = await getOwner();
  if (!organizer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: event } = await admin
    .from("events")
    .select("id, poster_url, organizer_id")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse multipart
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file in request" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP image" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 5MB" },
      { status: 413 },
    );
  }

  // Convert to Uint8Array for the Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let posterUrl: string;
  try {
    posterUrl = await uploadPoster(event.id, bytes, file.type);
  } catch (err) {
    console.error("[poster POST] upload failed", err);
    return NextResponse.json({ error: "Couldn't save poster" }, { status: 500 });
  }

  // Persist the URL on the event row
  const { error: updateErr } = await admin
    .from("events")
    .update({ poster_url: posterUrl })
    .eq("id", event.id);

  if (updateErr) {
    console.error("[poster POST] event update failed", updateErr);
    return NextResponse.json({ error: "Couldn't update event" }, { status: 500 });
  }

  // Best-effort cleanup of the previous poster
  if (event.poster_url) {
    deletePoster(event.poster_url).catch((err) =>
      console.warn("[poster POST] old-poster cleanup failed", err),
    );
  }

  return NextResponse.json({ poster_url: posterUrl });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { organizer } = await getOwner();
  if (!organizer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: event } = await admin
    .from("events")
    .select("id, poster_url")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (event.poster_url) {
    await deletePoster(event.poster_url).catch((err) =>
      console.warn("[poster DELETE] storage delete failed", err),
    );
  }
  await admin.from("events").update({ poster_url: null }).eq("id", event.id);

  return NextResponse.json({ ok: true });
}

async function getOwner() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { organizer: null };
  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return { organizer };
}
