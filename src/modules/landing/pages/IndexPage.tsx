import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import IntroSection from "@/modules/landing/components/IntroSection";
import ApplicationsSection from "@/modules/landing/components/ApplicationsSection";
import ProjectsShowcase from "@/modules/landing/components/ProjectsShowcase";
import CommunitySection from "@/modules/landing/components/CommunitySection";
import HighlightsSection from "@/modules/landing/components/HighlightsSection";
import PillarsSection from "@/modules/landing/components/PillarsSection";
import CTASection from "@/modules/landing/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <IntroSection />
      <ApplicationsSection />
      <ProjectsShowcase />
      <CommunitySection />
      <HighlightsSection />
      <PillarsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
