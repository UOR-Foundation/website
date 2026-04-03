import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import WhatIsUorSection from "@/modules/landing/components/WhatIsUorSection";
import EcosystemSection from "@/modules/landing/components/EcosystemSection";
import CommunitySection from "@/modules/landing/components/CommunitySection";
import ClosingCTASection from "@/modules/landing/components/ClosingCTASection";
import PrimeConstellationBg from "@/modules/landing/components/PrimeConstellationBg";

const Index = () => {
  return (
    <Layout>
      <PrimeConstellationBg />
      <HeroSection />
      <WhatIsUorSection />
      <ClosingCTASection />
      <CommunitySection />
      <EcosystemSection />
    </Layout>
  );
};

export default Index;
