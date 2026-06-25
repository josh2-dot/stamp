import { TopNav } from "@/components/landing/TopNav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function Page() {
  return (
    <>
      <TopNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
