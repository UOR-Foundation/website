import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import IntroSection from "@/modules/landing/components/IntroSection";
import PillarsSection from "@/modules/landing/components/PillarsSection";
import HighlightsSection from "@/modules/landing/components/HighlightsSection";
import ProjectsShowcase from "@/modules/landing/components/ProjectsShowcase";
import CTASection from "@/modules/landing/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <IntroSection />
      <PillarsSection />
      <HighlightsSection />
      <ProjectsShowcase />
      <CTASection />
    </Layout>
  );
};

export default Index;
