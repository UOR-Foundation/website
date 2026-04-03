import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import WhatIsUorSection from "@/modules/landing/components/WhatIsUorSection";
import EcosystemSection from "@/modules/landing/components/EcosystemSection";
import ClosingCTASection from "@/modules/landing/components/ClosingCTASection";
import PrimeConstellationBg from "@/modules/landing/components/PrimeConstellationBg";

const Index = () => {
  return (
    <Layout>
      <PrimeConstellationBg />
      <HeroSection />
      <EcosystemSection />
      <WhatIsUorSection />
      <ClosingCTASection />
    </Layout>
  );
};

export default Index;
