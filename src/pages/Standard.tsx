import Layout from "@/components/Layout";
import { Shield, Layers, Link2, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Content-Addressed Identity",
    description: "Objects identified by cryptographic hash. Verifiable without central authority.",
  },
  {
    icon: Layers,
    title: "Composable Primitives",
    description: "Intrinsic attributes compose into complex structures with referential integrity.",
  },
  {
    icon: Link2,
    title: "Semantic Interoperability",
    description: "Bridges formats and protocols. No custom integration required.",
  },
  {
    icon: Zap,
    title: "Decentralized Determinism",
    description: "Location-independent access without sacrificing consistency.",
  },
];

const Standard = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The Standard
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Composable data identified by content, not location.
          </p>
        </div>
      </section>

       <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl border border-border p-8 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Read the Specification on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
