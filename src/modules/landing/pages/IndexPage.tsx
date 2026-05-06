import { useCallback, useEffect, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import PrimeConstellationBg from "@/modules/landing/components/PrimeConstellationBg";
import LazySection from "@/modules/landing/components/LazySection";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeviceClass } from "@/hooks/use-device-class";

const Index = () => {
  const isMobile = useIsMobile();
  const deviceClass = useDeviceClass();
  // Defer the constellation canvas until the browser is idle. Keeps
  // first paint and hero animation crisp on mid-tier hardware.
  const [bgReady, setBgReady] = useState(false);
  useEffect(() => {
    if (isMobile || deviceClass === "low") return;
    const id = "requestIdleCallback" in window
      ? (window as any).requestIdleCallback(() => setBgReady(true), { timeout: 1500 })
      : window.setTimeout(() => setBgReady(true), 600);
    return () => {
      if ("cancelIdleCallback" in window) (window as any).cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [isMobile, deviceClass]);

  const community = useCallback(() => import("@/modules/landing/components/CommunitySection"), []);
  const whatIsUor = useCallback(() => import("@/modules/landing/components/WhatIsUorSection"), []);
  const closingCTA = useCallback(() => import("@/modules/landing/components/ClosingCTASection"), []);
  const highlights = useCallback(() => import("@/modules/landing/components/HighlightsSection"), []);
  const readyToBuild = useCallback(() => import("@/modules/landing/components/ReadyToBuildCTA"), []);

  return (
    <Layout>
      {!isMobile && deviceClass !== "low" && bgReady && <PrimeConstellationBg />}
      <HeroSection />
      <LazySection factory={community} />
      <LazySection factory={whatIsUor} />
      <LazySection factory={closingCTA} />
      <LazySection factory={highlights} />
      <LazySection factory={readyToBuild} />
    </Layout>
  );
};

export default Index;
