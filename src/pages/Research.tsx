import Layout from "@/components/Layout";
import { FileText, Users, FlaskConical } from "lucide-react";

const researchAreas = [
  {
    icon: FileText,
    title: "UOR Specification",
    description: "Formalizing the universal coordinate system — content-addressed identity, intrinsic attributes, and composable data primitives.",
  },
  {
    icon: Users,
    title: "Semantic Interoperability",
    description: "Research into bridging heterogeneous data systems through universal referencing, enabling seamless cross-domain data exchange.",
  },
  {
    icon: FlaskConical,
    title: "Applied Research",
    description: "Real-world applications of the UOR standard in frontier technology, scientific data management, and decentralized infrastructure.",
  },
];

const Research = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Research
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Advancing the science behind universal data infrastructure through open, peer-reviewed research and community collaboration.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {researchAreas.map((area, index) => (
              <div
                key={area.title}
                className="bg-card rounded-2xl border border-border p-8 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <area.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">{area.title}</h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">{area.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Contributing to Research
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-6">
              The UOR Foundation welcomes researchers, academics, and practitioners who want to contribute to the development of universal data standards. Our research is open-access and community-driven.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                View Research on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;
