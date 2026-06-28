import { NextResponse } from "next/server";
import { getPlatformFees } from "@/lib/fee-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public read of the current platform fee config. Used by client-side
 * payout-preview UI in the organizer's new/edit-event forms — they need
 * to render live fee math as the organizer types, and don't have DB access.
 *
 * Safe to expose: these are the same numbers we publish on /pricing.
 */
export async function GET() {
  const { base, rate } = await getPlatformFees();
  return NextResponse.json({ fee_base_kobo: base, fee_rate_bps: rate });
}
