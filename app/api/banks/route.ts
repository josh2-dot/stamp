import { NextResponse } from "next/server";
import { listBanks } from "@/lib/paystack";

export const runtime = "nodejs";
// Cache the bank list at the route layer for a day too — the upstream
// Paystack call is already cached, but this avoids the extra fetch hop.
export const revalidate = 86_400;

export async function GET() {
  try {
    const banks = await listBanks();
    // Slim down the payload — UI only needs name + code
    const slim = banks
      .map((b) => ({ name: b.name, code: b.code }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ banks: slim });
  } catch (err) {
    console.error("[banks] list failed", err);
    return NextResponse.json({ error: "Couldn't load banks" }, { status: 502 });
  }
}
