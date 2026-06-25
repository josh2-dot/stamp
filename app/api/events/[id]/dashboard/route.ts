import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { DashboardSnapshot, TicketTier, Event } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Auth
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // 2. Ownership check
  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) return NextResponse.json({ error: "No organizer profile" }, { status: 403 });

  const { data: event, error: eventErr } = await admin
    .from("events")
    .select("*")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .single();
  if (eventErr || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // 3. Aggregate
  const { data: tiers } = await admin
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", params.id)
    .order("sort_order", { ascending: true });

  const { data: tickets } = await admin
    .from("tickets")
    .select(`id, buyer_name, buyer_phone, amount_paid, created_at, used, status, tier_id,
       ticket_tiers!inner(name)`)
    .eq("event_id", params.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  const tierList = (tiers ?? []) as TicketTier[];
  const paidTickets = tickets ?? [];

  const totalCapacity = tierList.reduce((s, t) => s + t.capacity, 0);
  const totalSold = tierList.reduce((s, t) => s + t.sold, 0);
  const grossKobo = paidTickets.reduce((s, t) => s + t.amount_paid, 0);

  const tierMap = new Map(tierList.map((t) => [t.id, t]));
  const feesKobo = paidTickets.reduce((sum, t) => {
    const tier = tierMap.get(t.tier_id);
    return sum + (tier ? t.amount_paid - tier.price : 0);
  }, 0);
  const netToOrganizerKobo = grossKobo - feesKobo;
  const checkedIn = paidTickets.filter((t) => t.used).length;

  // Hourly bucket over the last 24h
  const now = Date.now();
  const buckets = new Map<string, { count: number; revenue: number }>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 3_600_000);
    d.setMinutes(0, 0, 0);
    buckets.set(d.toISOString(), { count: 0, revenue: 0 });
  }
  for (const t of paidTickets) {
    const d = new Date(t.created_at);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    if (buckets.has(key)) {
      const b = buckets.get(key)!;
      b.count += 1;
      b.revenue += t.amount_paid;
    }
  }
  const hourly = Array.from(buckets.entries()).map(([hour, v]) => ({
    hour,
    count: v.count,
    revenue: v.revenue,
  }));

  const recent = paidTickets.slice(0, 20).map((t) => {
    const tier = Array.isArray(t.ticket_tiers) ? t.ticket_tiers[0] : t.ticket_tiers;
    return {
      id: t.id,
      buyer_name: t.buyer_name,
      buyer_phone: t.buyer_phone,
      amount_paid: t.amount_paid,
      created_at: t.created_at,
      used: t.used,
      tier_name: tier?.name ?? "—",
    };
  });

  const snapshot: DashboardSnapshot = {
    event: event as Event,
    tiers: tierList,
    totalSold,
    totalCapacity,
    grossKobo,
    feesKobo,
    netToOrganizerKobo,
    checkedIn,
    recentTickets: recent,
    hourly,
  };

  return NextResponse.json(snapshot);
}
