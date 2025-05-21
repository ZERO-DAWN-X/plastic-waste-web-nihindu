import { HeroSection } from "../components/hero/HeroSection";
import { SimpleFooter } from "../components/layout/SimpleFooter";
import { SimpleHeader } from "../components/layout/SimpleHeader";
import { FeaturesSection } from "../components/sections/FeaturesSection";
import { HowItWorksSection } from "../components/sections/HowItWorksSection";
import { StatsSection } from "../components/sections/StatsSection";

export default function Home() {
  return (
    <>
      <SimpleHeader />
      <main className="flex flex-col min-h-screen bg-gradient-to-b from-white to-primary/5">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
      </main>
      <SimpleFooter />
    </>
  );
}
