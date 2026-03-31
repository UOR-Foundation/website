import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import MissionSection from "@/modules/landing/components/MissionSection";
import IntroSection from "@/modules/landing/components/IntroSection";
import ApplicationsSection from "@/modules/landing/components/ApplicationsSection";
import PillarsSection from "@/modules/landing/components/PillarsSection";
import ProjectsShowcase from "@/modules/landing/components/ProjectsShowcase";
import CTASection from "@/modules/landing/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <MissionSection />
      <IntroSection />
      <ApplicationsSection />
      <PillarsSection />
      <ProjectsShowcase />
      <CTASection />
    </Layout>
  );
};

export default Index;
