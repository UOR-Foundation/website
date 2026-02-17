import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import IntroSection from "@/components/IntroSection";
import PillarsSection from "@/components/PillarsSection";
import HighlightsSection from "@/components/HighlightsSection";
import ProjectsShowcase from "@/components/ProjectsShowcase";
import CTASection from "@/components/CTASection";

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
