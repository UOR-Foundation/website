import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/sections/HeroSection";
import IntroSection from "@/components/sections/IntroSection";
import PillarsSection from "@/components/sections/PillarsSection";
import HighlightsSection from "@/components/sections/HighlightsSection";
import ProjectsShowcase from "@/components/sections/ProjectsShowcase";
import CTASection from "@/components/sections/CTASection";

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
