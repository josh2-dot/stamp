// All monetary values are stored and passed in kobo (integer).

export type TicketStatus = "pending" | "paid" | "failed";
export type TransactionStatus = "pending" | "success" | "failed";

export interface Organizer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_recipient_code: string | null;
  auth_user_id: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  venue: string;
  event_date: string;
  poster_url: string | null;
  slug: string;
  scanner_secret: string;
  is_active: boolean;
  created_at: string;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  price: number;
  service_fee: number;
  capacity: number;
  sold: number;
  sort_order: number;
}

export interface Ticket {
  id: string;
  event_id: string;
  tier_id: string;
  buyer_name: string | null;
  buyer_phone: string;
  qr_code: string;
  qr_image_url: string | null;
  paystack_ref: string | null;
  amount_paid: number;
  status: TicketStatus;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  ticket_id: string;
  paystack_ref: string;
  amount: number;
  status: TransactionStatus;
  raw_payload: unknown;
  created_at: string;
}

export type WithdrawalStatus =
  | "pending"
  | "otp_required"
  | "processing"
  | "success"
  | "failed"
  | "reversed";

export interface Withdrawal {
  id: string;
  organizer_id: string;
  amount: number;
  status: WithdrawalStatus;
  paystack_transfer_code: string | null;
  paystack_reference: string;
  failure_reason: string | null;
  requested_at: string;
  completed_at: string | null;
  raw_payload: unknown;
}

export interface BalanceSummary {
  earned: number;     // total face-value across all paid tickets, kobo
  available: number;  // earned - in_flight - paid_out, kobo
  in_flight: number;  // pending/otp_required/processing withdrawals, kobo
  paid_out: number;   // successful withdrawals, kobo
}

export interface CreateWithdrawalRequest {
  amount: number; // in kobo
}

export type CreateWithdrawalResponse =
  | { status: "success"; withdrawalId: string }
  | { status: "otp_required"; withdrawalId: string; message: string }
  | { status: "processing"; withdrawalId: string };

export interface EditEventRequest {
  title?: string;
  venue?: string;
  description?: string | null;
  event_date?: string;     // ISO
  is_active?: boolean;
  tiers?: Array<{
    id?: string;            // present = update existing; absent = insert new
    name: string;
    price_naira: number;
    service_fee_naira: number;
    capacity: number;
    sort_order?: number;
  }>;
}

export interface EditEventResponse {
  id: string;
  slug: string;
  is_active: boolean;
}

// ---- API contracts ------------------------------------------

export interface CheckoutRequest {
  tierId: string;
  buyerPhone: string;
  buyerName?: string;
  email?: string;
}

export interface CheckoutResponse {
  authorizationUrl: string;
  reference: string;
}

export type VerifyResponse =
  | {
      valid: true;
      ticket: {
        id: string;
        tierName: string;
        buyerName: string | null;
        buyerPhone: string;
      };
    }
  | {
      valid: false;
      reason: "already_scanned" | "invalid" | "wrong_event" | "unpaid";
      usedAt?: string;
    };

export interface DashboardSnapshot {
  event: Event;
  tiers: TicketTier[];
  totalSold: number;
  totalCapacity: number;
  grossKobo: number;
  feesKobo: number;
  netToOrganizerKobo: number;
  checkedIn: number;
  recentTickets: Array<
    Pick<Ticket, "id" | "buyer_name" | "buyer_phone" | "amount_paid" | "created_at" | "used"> & {
      tier_name: string;
    }
  >;
  hourly: Array<{ hour: string; count: number; revenue: number }>;
}

// ---- Paystack ------------------------------------------------

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    customer: { email: string };
    metadata: Record<string, unknown>;
  };
}
