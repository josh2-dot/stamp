import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { StampSeal } from "@/components/ui/StampSeal";

export const dynamic = "force-dynamic";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/organizers", label: "Organizers" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentAdmin();
  if (!me) {
    // Bounce non-admins straight back to the organizer dashboard. No "you
    // don't have permission" screen — the route doesn't exist as far as
    // they're concerned.
    redirect("/dashboard");
  }

  return (
    <>
      {/* Admin top bar — visually distinct from the organizer dashboard.
          Black surface, no logo wordmark, "Admin" badge so it's obvious
          this is internal tooling. */}
      <header className="border-b border-stamp-border bg-stamp-surface/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 group">
            <StampSeal size={28} />
            <span className="font-display text-display-xs">STAMP</span>
            <Badge tone="warning">Admin</Badge>
          </Link>

          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-sm text-stamp-muted-2 hover:text-stamp-white px-3 py-1.5 rounded-md hover:bg-stamp-surface2 transition-colors whitespace-nowrap"
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="text-xs text-stamp-muted-2 hidden sm:block">
            {me.email}
            {" · "}
            <Link href="/dashboard" className="hover:text-stamp-orange">
              Exit admin →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">{children}</main>
    </>
  );
}
