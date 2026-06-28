import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Organizer's nominations review feed for a category.
 *
 * Groups raw nominations by name (case-insensitive, trimmed) — the
 * organizer sees a clean list of unique candidates with vote counts and
 * the nominator phones underneath if they want to investigate.
 *
 * The grouping is the manual deduplication signal: if "Joshua Theophilus"
 * has 12 nominations and "Joshua Theophillus" has 1, the organizer
 * obviously promotes the first and either merges the typo or rejects it.
 * No fuzzy matching — the organizer does the work.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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

  const { data: category } = await admin
    .from("award_categories")
    .select("*, events!inner(organizer_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ev = Array.isArray(category.events) ? category.events[0] : category.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Raw nominations + nominees in parallel
  const [{ data: rawNoms }, { data: nominees }] = await Promise.all([
    admin
      .from("award_nominations")
      .select("id, nominee_name, nominator_phone, status, resolved_to, created_at")
      .eq("category_id", params.id)
      .order("created_at", { ascending: false }),
    admin
      .from("award_nominees")
      .select("*")
      .eq("category_id", params.id)
      .order("sort_order", { ascending: true }),
  ]);

  // Group raw pending nominations by normalized name
  type Group = {
    name_normalized: string;
    sample_name: string;
    count: number;
    nominator_phones: string[];
    nomination_ids: string[];
  };
  const groups = new Map<string, Group>();
  for (const n of rawNoms ?? []) {
    if (n.status !== "pending") continue;
    const key = n.nominee_name.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.nominator_phones.push(n.nominator_phone);
      existing.nomination_ids.push(n.id);
    } else {
      groups.set(key, {
        name_normalized: key,
        sample_name: n.nominee_name.trim(),
        count: 1,
        nominator_phones: [n.nominator_phone],
        nomination_ids: [n.id],
      });
    }
  }

  const groupedPending = Array.from(groups.values()).sort((a, b) => b.count - a.count);

  // Also surface rejected nominations so organizers can un-reject if they
  // change their mind. Promoted ones already appear in the nominees list.
  const rejected = (rawNoms ?? []).filter((n) => n.status === "rejected");

  return NextResponse.json({
    category,
    grouped_pending: groupedPending,
    nominees: nominees ?? [],
    rejected,
  });
}
