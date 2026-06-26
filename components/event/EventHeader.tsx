import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Event } from "@/types";

interface EventHeaderProps {
  event: Event;
}

export function EventHeader({ event }: EventHeaderProps) {
  const date = new Date(event.event_date);
  const dateStr = date.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
  const timeStr = date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

  const isPast = date.getTime() < Date.now();

  return (
    <div className="relative">
      {event.poster_url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-stamp-border mb-8">
          <img
            src={event.poster_url}
            alt={`${event.title} poster`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stamp-black via-stamp-black/40 to-transparent" />
        </div>
      )}

      <div className="space-y-4">
        {/* Was tone="success" — DESIGN.md reserves green for gate verification.
            "Tickets on sale" uses default tone + pulsing dot for active state. */}
        <Badge tone="default" dot={!isPast}>
          {isPast ? "Event ended" : "Tickets on sale"}
        </Badge>

        <h1 className="font-display text-display-lg sm:text-display-xl text-stamp-white text-balance">
          {event.title}
        </h1>

        {/* Emoji 📅 📍 dropped — they're OS-rendered and inconsistent against
            the bespoke seal/scanner marks. Using Eyebrow labels reads as
            metadata, not decoration. The WhatsApp preview in Features.tsx
            keeps emoji because that's authentic to the medium. */}
        <dl className="flex flex-wrap gap-x-10 gap-y-4 pt-2">
          <div>
            <Eyebrow>When</Eyebrow>
            <dd className="text-stamp-white mt-1">
              {dateStr} · <span className="text-stamp-muted-2">{timeStr}</span>
            </dd>
          </div>
          <div>
            <Eyebrow>Where</Eyebrow>
            <dd className="text-stamp-white mt-1">{event.venue}</dd>
          </div>
        </dl>

        {event.description && (
          <p className="text-stamp-white leading-relaxed max-w-2xl pt-4 whitespace-pre-line">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
