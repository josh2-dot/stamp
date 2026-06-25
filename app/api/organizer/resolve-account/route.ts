import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveAccount } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  accountNumber: string;
  bankCode: string;
}

export async function POST(req: NextRequest) {
  // Auth — keeps the Paystack rate limit bound to signed-in users
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const acct = (body.accountNumber || "").replace(/\D/g, "");
  const code = (body.bankCode || "").trim();

  if (acct.length !== 10) {
    return NextResponse.json(
      { error: "Account number must be 10 digits" },
      { status: 400 },
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Pick a bank first" }, { status: 400 });
  }

  try {
    const { accountName, accountNumber } = await resolveAccount(acct, code);
    return NextResponse.json({ accountName, accountNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolution failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
