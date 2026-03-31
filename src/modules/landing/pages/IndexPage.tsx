import Layout from "@/modules/core/components/Layout";
import HeroSection from "@/modules/landing/components/HeroSection";
import IntroSection from "@/modules/landing/components/IntroSection";
import CodeExampleSection from "@/modules/landing/components/CodeExampleSection";
import PillarsSection from "@/modules/landing/components/PillarsSection";
import ProjectsShowcase from "@/modules/landing/components/ProjectsShowcase";
import CTASection from "@/modules/landing/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <IntroSection />
      <CodeExampleSection />
      <PillarsSection />
      <ProjectsShowcase />
      <CTASection />
    </Layout>
  );
};

export default Index;
