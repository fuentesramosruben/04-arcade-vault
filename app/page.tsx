import { Hero } from "@/components/home/hero";
import { WhySection } from "@/components/home/why-section";

export default function Home() {
  return (
    <div className="home fade-in">
      <Hero />
      <WhySection />
    </div>
  );
}
