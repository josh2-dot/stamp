import { StampSeal } from "@/components/ui/StampSeal";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function Footer() {
  return (
    <footer className="border-t border-stamp-border py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-[auto_1fr_1fr_1fr] gap-12 items-start">
          <div>
            {/* Sign-off use of the seal — DESIGN.md ✅ */}
            <StampSeal size={80} />
          </div>

          <div>
            <Eyebrow className="mb-4">Product</Eyebrow>
            <ul className="space-y-2 text-sm">
              <li><a href="#how" className="hover:text-stamp-orange transition-colors">How it works</a></li>
              <li><a href="#pricing" className="hover:text-stamp-orange transition-colors">Pricing</a></li>
              <li><a href="/dashboard" className="hover:text-stamp-orange transition-colors">Dashboard</a></li>
            </ul>
          </div>

          <div>
            <Eyebrow className="mb-4">Support</Eyebrow>
            <ul className="space-y-2 text-sm">
              <li><a href="https://wa.me/2348012345678" className="hover:text-stamp-orange transition-colors">WhatsApp us</a></li>
              <li><a href="mailto:hi@stamptickets.ng" className="hover:text-stamp-orange transition-colors">hi@stamptickets.ng</a></li>
            </ul>
          </div>

          <div>
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <ul className="space-y-2 text-sm">
              <li><a href="/terms" className="hover:text-stamp-orange transition-colors">Terms</a></li>
              <li><a href="/privacy" className="hover:text-stamp-orange transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stamp-border flex flex-wrap justify-between gap-4 items-center text-xs text-stamp-muted">
          <p>© {new Date().getFullYear()} STAMP. Built in Port Harcourt.</p>
          <p className="tracking-[0.2em] uppercase">RSU · PH · Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
