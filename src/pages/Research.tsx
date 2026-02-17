import Layout from "@/components/Layout";
import { FileText, Users, FlaskConical } from "lucide-react";

const researchAreas = [
  {
    icon: FileText,
    title: "UOR Specification",
    description: "Formalizing content-addressed identity, intrinsic attributes, and composable primitives.",
  },
  {
    icon: Users,
    title: "Semantic Interoperability",
    description: "Bridging heterogeneous data systems through universal referencing.",
  },
  {
    icon: FlaskConical,
    title: "Applied Research",
    description: "Real-world applications in frontier technology and research, and decentralized infrastructure.",
  },
];

const Research = () => {
  return (
    <Layout>
      <section className="hero-gradient pt-28 md:pt-36 pb-20 md:pb-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Research
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Open research advancing universal data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-28 bg-background">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mb-14 md:mb-16">
            {researchAreas.map((area, index) => (
              <div
                key={area.title}
                className="group bg-card rounded-2xl border border-border p-7 md:p-9 animate-fade-in-up hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                  <area.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3">{area.title}</h3>
                <p className="text-muted-foreground font-body text-base leading-relaxed">{area.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              View Research on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;
