import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createTransferRecipient, resolveAccount } from "@/lib/paystack";
import { validateNigerianPhone } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrganizer() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, organizer: null };

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select(
      `id, name, phone, email, bank_name, bank_code, account_number,
       account_name, paystack_recipient_code, auth_user_id`,
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, organizer };
}

export async function GET() {
  const { user, organizer } = await getOrganizer();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!organizer) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Don't return the phone if it's still the placeholder — UI shows empty
  const phone = organizer.phone.startsWith("PENDING_") ? "" : organizer.phone;
  return NextResponse.json({ ...organizer, phone });
}

interface PatchBody {
  name?: string;
  phone?: string;
  bank_code?: string;
  bank_name?: string;
  account_number?: string;
}

export async function PATCH(req: NextRequest) {
  const { user, organizer } = await getOrganizer();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!organizer) return NextResponse.json({ error: "No profile" }, { status: 404 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // ---- Validate profile fields ------------------------------
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Organization name can't be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (body.phone !== undefined) {
    const trimmed = body.phone.trim();
    if (!validateNigerianPhone(trimmed)) {
      return NextResponse.json(
        { error: "Phone number must be a valid Nigerian number" },
        { status: 400 },
      );
    }
    updates.phone = trimmed;
  }

  // ---- Bank handling ----------------------------------------
  const bankFieldsTouched =
    body.bank_code !== undefined ||
    body.bank_name !== undefined ||
    body.account_number !== undefined;

  if (bankFieldsTouched) {
    const bankCode = (body.bank_code ?? organizer.bank_code ?? "").trim();
    const bankName = (body.bank_name ?? organizer.bank_name ?? "").trim();
    const acct = (body.account_number ?? organizer.account_number ?? "").replace(/\D/g, "");

    if (!bankCode || !bankName) {
      return NextResponse.json({ error: "Pick a bank" }, { status: 400 });
    }
    if (acct.length !== 10) {
      return NextResponse.json({ error: "Account number must be 10 digits" }, { status: 400 });
    }

    const acctChanged =
      acct !== (organizer.account_number ?? "") || bankCode !== (organizer.bank_code ?? "");

    if (acctChanged) {
      // Re-verify with Paystack so the stored account_name is canonical,
      // then re-create the transfer recipient.
      try {
        const { accountName } = await resolveAccount(acct, bankCode);
        updates.account_name = accountName;
        updates.account_number = acct;
        updates.bank_code = bankCode;
        updates.bank_name = bankName;

        try {
          const { recipientCode } = await createTransferRecipient({
            name: accountName,
            accountNumber: acct,
            bankCode,
          });
          updates.paystack_recipient_code = recipientCode;
        } catch (recipientErr) {
          // Verification succeeded but recipient creation failed —
          // save the verified details, defer recipient creation to retry.
          console.error("[settings] recipient creation failed", recipientErr);
          updates.paystack_recipient_code = null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Bank verification failed";
        return NextResponse.json({ error: message }, { status: 422 });
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noChange: true });
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("organizers")
    .update(updates)
    .eq("id", organizer.id);

  if (error) {
    console.error("[settings] update failed", error);
    return NextResponse.json({ error: "Couldn't save changes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
