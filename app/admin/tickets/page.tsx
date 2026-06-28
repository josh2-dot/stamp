import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TicketLookup } from "./TicketLookup";

export const dynamic = "force-dynamic";

export default function AdminTicketsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Eyebrow>Ticket lookup</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          Find any ticket.
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3">
          Search by Paystack reference, buyer phone, or QR code UUID. Useful
          when a buyer DMs support saying their WhatsApp didn't arrive.
        </p>
      </div>

      <Card>
        <TicketLookup />
      </Card>
    </div>
  );
}
