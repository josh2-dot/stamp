import Link from "next/link";
import { StampSeal } from "@/components/ui/StampSeal";
import { Button } from "@/components/ui/Button";

export function TopNav() {
  return (
    <header className="absolute top-0 inset-x-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <StampSeal size={44} className="transition-transform group-hover:rotate-6" />
          <span className="text-display text-xl">STAMP</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="#how" className="hidden sm:inline-block text-sm text-stamp-muted hover:text-stamp-white transition-colors px-3 py-2">
            How
          </Link>
          <Link href="#pricing" className="hidden sm:inline-block text-sm text-stamp-muted hover:text-stamp-white transition-colors px-3 py-2">
            Pricing
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">Organizer login</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
