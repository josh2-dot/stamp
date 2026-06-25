import crypto from "node:crypto";
import type { PaystackInitResponse, PaystackVerifyResponse } from "@/types";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE = "https://api.paystack.co";

function headers() {
  if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

export async function initializeTransaction(params: {
  email: string;
  amount: number; // kobo
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
}): Promise<PaystackInitResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    }),
    cache: "no-store",
  });
  return (await res.json()) as PaystackInitResponse;
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: headers(),
    cache: "no-store",
  });
  return (await res.json()) as PaystackVerifyResponse;
}

/**
 * Verify Paystack webhook HMAC. Always call this BEFORE doing any work
 * in the webhook handler. Reject with 401 if false.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(rawBody)
    .digest("hex");
  // Constant-time compare
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ============================================================
// Transfers (settlement / payouts)
// ============================================================

export type PaystackTransferStatus =
  | "pending"
  | "otp"
  | "success"
  | "failed"
  | "reversed";

interface InitiateTransferResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    transfer_code: string;
    status: PaystackTransferStatus;
    amount: number;
    recipient: string;
  };
}

/**
 * Initiate a transfer to a registered recipient. Returns the Paystack
 * transfer_code which is what we use to track + finalize.
 *
 * - If the merchant account has OTP disabled, Paystack returns status="success"
 *   immediately and the webhook will fire transfer.success shortly.
 * - Otherwise Paystack returns status="otp" and we must call finalizeTransfer
 *   with the code Paystack sends to the merchant's registered phone/email.
 */
export async function initiateTransfer(args: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<{
  status: PaystackTransferStatus;
  transferCode: string;
  reference: string;
  message: string;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      source: "balance",
      amount: args.amountKobo,
      recipient: args.recipientCode,
      reason: args.reason,
      reference: args.reference,
    }),
    cache: "no-store",
  });
  const body = (await res.json()) as InitiateTransferResponse;
  if (!body.status || !body.data) {
    throw new Error(body.message || "Transfer initiation failed");
  }
  return {
    status: body.data.status,
    transferCode: body.data.transfer_code,
    reference: body.data.reference,
    message: body.message,
  };
}

interface FinalizeTransferResponse {
  status: boolean;
  message: string;
  data?: {
    transfer_code: string;
    status: PaystackTransferStatus;
    reference: string;
  };
}

/**
 * Submit the OTP Paystack sent to the merchant to finalize a transfer.
 */
export async function finalizeTransfer(
  transferCode: string,
  otp: string,
): Promise<{ status: PaystackTransferStatus; message: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer/finalize_transfer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ transfer_code: transferCode, otp }),
    cache: "no-store",
  });
  const body = (await res.json()) as FinalizeTransferResponse;
  if (!body.status || !body.data) {
    throw new Error(body.message || "OTP verification failed");
  }
  return { status: body.data.status, message: body.message };
}

// ============================================================
// Bank lookup + transfer recipient setup
// ============================================================

export interface PaystackBank {
  name: string;
  code: string;
  longcode: string | null;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

interface PaystackListBanksResponse {
  status: boolean;
  message: string;
  data: PaystackBank[];
}

/**
 * Full list of Nigerian banks. Cached at the edge for a day; the list
 * rarely changes.
 */
export async function listBanks(): Promise<PaystackBank[]> {
  const res = await fetch(`${PAYSTACK_BASE}/bank?country=nigeria`, {
    headers: headers(),
    next: { revalidate: 86_400 },
  });
  const body = (await res.json()) as PaystackListBanksResponse;
  if (!body.status) throw new Error(body.message || "Failed to load banks");
  return body.data.filter((b) => b.active);
}

interface ResolveAccountResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
  };
}

/**
 * Resolve a Nigerian account number against a bank code. Returns the
 * official account holder name. Throws on failure.
 */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string; accountNumber: string }> {
  const url = new URL(`${PAYSTACK_BASE}/bank/resolve`);
  url.searchParams.set("account_number", accountNumber);
  url.searchParams.set("bank_code", bankCode);

  const res = await fetch(url.toString(), {
    headers: headers(),
    cache: "no-store",
  });
  const body = (await res.json()) as ResolveAccountResponse;
  if (!body.status || !body.data) {
    throw new Error(body.message || "Could not verify account");
  }
  return {
    accountName: body.data.account_name,
    accountNumber: body.data.account_number,
  };
}

interface CreateRecipientResponse {
  status: boolean;
  message: string;
  data?: {
    recipient_code: string;
    type: string;
    name: string;
    details: { account_number: string; bank_code: string };
  };
}

/**
 * Create a Paystack transfer recipient — required before any payout call.
 * Returns the recipient_code we should store on the organizer row.
 */
export async function createTransferRecipient(args: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ recipientCode: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: "nuban",
      name: args.name,
      account_number: args.accountNumber,
      bank_code: args.bankCode,
      currency: "NGN",
    }),
    cache: "no-store",
  });
  const body = (await res.json()) as CreateRecipientResponse;
  if (!body.status || !body.data) {
    throw new Error(body.message || "Could not create transfer recipient");
  }
  return { recipientCode: body.data.recipient_code };
}
