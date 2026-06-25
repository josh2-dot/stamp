import { Badge } from "@/components/ui/Badge";
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
        <Badge tone={isPast ? "default" : "success"} dot={!isPast}>
          {isPast ? "Event ended" : "Tickets on sale"}
        </Badge>

        <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl text-balance leading-[0.95]">
          {event.title}
        </h1>

        <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-stamp-muted">
          <div className="flex items-center gap-2">
            <span aria-hidden="true">📅</span>
            <span>
              {dateStr} · <span className="text-stamp-white">{timeStr}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true">📍</span>
            <span className="text-stamp-white">{event.venue}</span>
          </div>
        </div>

        {event.description && (
          <p className="text-stamp-white/80 leading-relaxed max-w-2xl pt-4 whitespace-pre-line">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
