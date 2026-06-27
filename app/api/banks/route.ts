import { NextResponse } from "next/server";
import { listBanks } from "@/lib/paystack";

export const runtime = "nodejs";
// Don't prerender at build time — this route needs PAYSTACK_SECRET_KEY at
// runtime. Without force-dynamic, Next.js attempts to fetch the bank list
// during static generation and logs an error (the build still completes).
export const dynamic = "force-dynamic";
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
