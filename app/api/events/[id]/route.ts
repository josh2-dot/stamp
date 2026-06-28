import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculatePlatformFee } from "@/lib/fee-rules";
import type { EditEventRequest, EditEventResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// GET /api/events/[id]
// Returns event + tiers if the signed-in user owns it.
// ============================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, organizer } = await getOwner();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!organizer) return NextResponse.json({ error: "No profile" }, { status: 403 });

  const admin = createAdminSupabase();
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: tiers } = await admin
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", params.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ event, tiers: tiers ?? [] });
}

// ============================================================
// PATCH /api/events/[id]
// Multi-purpose update — event fields, tier add/update/remove, is_active.
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, organizer } = await getOwner();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!organizer) return NextResponse.json({ error: "No profile" }, { status: 403 });

  let body: EditEventRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Ownership check
  const { data: event } = await admin
    .from("events")
    .select("id, slug, is_active")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ---- 1. Event field updates --------------------------------
  const eventUpdate: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    }
    eventUpdate.title = trimmed;
  }

  if (body.venue !== undefined) {
    const trimmed = body.venue.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Venue can't be empty" }, { status: 400 });
    }
    eventUpdate.venue = trimmed;
  }

  if (body.description !== undefined) {
    eventUpdate.description = body.description?.trim() || null;
  }

  if (body.event_date !== undefined) {
    const d = new Date(body.event_date);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    eventUpdate.event_date = d.toISOString();
  }

  if (body.is_active !== undefined) {
    eventUpdate.is_active = !!body.is_active;
  }

  // ---- 2. Tier diff ------------------------------------------
  if (body.tiers !== undefined) {
    if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
      return NextResponse.json(
        { error: "Event must have at least one tier" },
        { status: 400 },
      );
    }

    // Load existing tiers — needed for validation + diff
    const { data: existing } = await admin
      .from("ticket_tiers")
      .select("id, name, sold, capacity, price, service_fee, sort_order")
      .eq("event_id", event.id);

    const existingMap = new Map((existing ?? []).map((t) => [t.id, t]));
    const incomingIds = new Set(body.tiers.filter((t) => t.id).map((t) => t.id!));

    // 2a. Determine deletions — existing tiers not in the payload
    const toDelete = (existing ?? []).filter((t) => !incomingIds.has(t.id));

    // Block deletion of tiers with sold tickets
    const blockedDeletes = toDelete.filter((t) => t.sold > 0);
    if (blockedDeletes.length > 0) {
      const head = blockedDeletes[0]!;
      return NextResponse.json(
        {
          error: `Can't remove tier "${head.name}" — ${head.sold} ticket${head.sold === 1 ? " has" : "s have"} already been sold.`,
        },
        { status: 409 },
      );
    }

    // 2b. Validate every incoming tier
    for (const tier of body.tiers) {
      const name = tier.name?.trim();
      if (!name) {
        return NextResponse.json({ error: "Every tier needs a name" }, { status: 400 });
      }
      if (!Number.isFinite(tier.price_naira) || tier.price_naira < 0) {
        return NextResponse.json(
          { error: `Invalid price for tier "${name}"` },
          { status: 400 },
        );
      }
      // service_fee is computed server-side from the central fee rules —
      // organizers cannot set it (see lib/fee-rules.ts).
      const capacity = Math.floor(tier.capacity);
      if (!Number.isFinite(capacity) || capacity <= 0) {
        return NextResponse.json(
          { error: `Invalid capacity for tier "${name}"` },
          { status: 400 },
        );
      }

      // For existing tiers, prevent capacity going below sold count
      if (tier.id) {
        const prev = existingMap.get(tier.id);
        if (!prev) {
          return NextResponse.json(
            { error: `Unknown tier id ${tier.id}` },
            { status: 400 },
          );
        }
        if (capacity < prev.sold) {
          return NextResponse.json(
            {
              error: `Can't drop capacity of "${name}" below ${prev.sold} — that many already sold.`,
            },
            { status: 409 },
          );
        }
      }
    }

    // 2c. Apply deletes
    if (toDelete.length > 0) {
      const { error: delErr } = await admin
        .from("ticket_tiers")
        .delete()
        .in(
          "id",
          toDelete.map((t) => t.id),
        );
      if (delErr) {
        console.error("[events PATCH] tier delete failed", delErr);
        return NextResponse.json({ error: "Couldn't remove tiers" }, { status: 500 });
      }
    }

    // 2d. Apply updates + inserts
    let sortIdx = 0;
    for (const tier of body.tiers) {
      const sortOrder = tier.sort_order ?? sortIdx;
      sortIdx++;
      const priceKobo = Math.round(tier.price_naira * 100);
      const row = {
        event_id: event.id,
        name: tier.name.trim(),
        price: priceKobo,
        // STAMP fee, recomputed every save in case the rules change
        service_fee: await calculatePlatformFee(priceKobo),
        capacity: Math.floor(tier.capacity),
        sort_order: sortOrder,
      };

      if (tier.id) {
        const { error: upErr } = await admin
          .from("ticket_tiers")
          .update(row)
          .eq("id", tier.id);
        if (upErr) {
          console.error("[events PATCH] tier update failed", upErr);
          return NextResponse.json({ error: "Couldn't save tier changes" }, { status: 500 });
        }
      } else {
        const { error: insErr } = await admin.from("ticket_tiers").insert(row);
        if (insErr) {
          console.error("[events PATCH] tier insert failed", insErr);
          return NextResponse.json({ error: "Couldn't add new tier" }, { status: 500 });
        }
      }
    }
  }

  // ---- 3. Apply event-row updates ----------------------------
  if (Object.keys(eventUpdate).length > 0) {
    const { error: eventErr } = await admin
      .from("events")
      .update(eventUpdate)
      .eq("id", event.id);
    if (eventErr) {
      console.error("[events PATCH] event update failed", eventErr);
      return NextResponse.json({ error: "Couldn't save changes" }, { status: 500 });
    }
  }

  // ---- 4. Return current state ------------------------------
  const { data: fresh } = await admin
    .from("events")
    .select("id, slug, is_active")
    .eq("id", event.id)
    .single();

  const payload: EditEventResponse = {
    id: fresh!.id,
    slug: fresh!.slug,
    is_active: fresh!.is_active,
  };

  return NextResponse.json(payload);
}

// ============================================================
// Helpers
// ============================================================

async function getOwner() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, organizer: null };

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, organizer };
}
