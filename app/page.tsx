import { ActivitySection } from "@/components/home/activity-section";
import { FinalCta } from "@/components/home/final-cta";
import { GamesSection } from "@/components/home/games-section";
import { Hero } from "@/components/home/hero";
import { PricingSection } from "@/components/home/pricing-section";
import { StatsBand } from "@/components/home/stats-band";
import { WhySection } from "@/components/home/why-section";

export default function Home() {
  return (
    <div className="home fade-in">
      <Hero />
      <WhySection />
      <GamesSection />
      <StatsBand />
      <ActivitySection />
      <PricingSection />
      <FinalCta />
    </div>
  );
}
