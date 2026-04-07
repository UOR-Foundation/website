import { useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import PrimeConstellationBg from "@/modules/landing/components/PrimeConstellationBg";
import LazySection from "@/modules/landing/components/LazySection";

const Index = () => {
  const community = useCallback(() => import("@/modules/landing/components/CommunitySection"), []);
  const whatIsUor = useCallback(() => import("@/modules/landing/components/WhatIsUorSection"), []);
  const closingCTA = useCallback(() => import("@/modules/landing/components/ClosingCTASection"), []);
  const ecosystem = useCallback(() => import("@/modules/landing/components/EcosystemSection"), []);
  const highlights = useCallback(() => import("@/modules/landing/components/HighlightsSection"), []);
  const readyToBuild = useCallback(() => import("@/modules/landing/components/ReadyToBuildCTA"), []);

  return (
    <Layout>
      <PrimeConstellationBg />
      <HeroSection />
      <LazySection factory={community} />
      <LazySection factory={whatIsUor} />
      <LazySection factory={closingCTA} />
      <LazySection factory={ecosystem} />
      <LazySection factory={highlights} />
      <LazySection factory={readyToBuild} />
    </Layout>
  );
};

export default Index;
