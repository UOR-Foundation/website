import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import PillarsSection from "@/components/PillarsSection";
import ProjectsShowcase from "@/components/ProjectsShowcase";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <PillarsSection />
      <ProjectsShowcase />
      <CTASection />
    </Layout>
  );
};

export default Index;
