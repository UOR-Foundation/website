import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import MissionSection from "@/modules/landing/components/MissionSection";
import IntroSection from "@/modules/landing/components/IntroSection";
import ApplicationsSection from "@/modules/landing/components/ApplicationsSection";
import ProjectsShowcase from "@/modules/landing/components/ProjectsShowcase";
import CommunitySection from "@/modules/landing/components/CommunitySection";
import PillarsSection from "@/modules/landing/components/PillarsSection";
import CTASection from "@/modules/landing/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <MissionSection />
      <IntroSection />
      <ApplicationsSection />
      <ProjectsShowcase />
      <CommunitySection />
      <PillarsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
