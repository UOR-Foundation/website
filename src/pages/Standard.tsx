import Layout from "@/components/Layout";
import { Shield, Layers, Link2, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Content-Addressed Identity",
    description: "Every data object is identified by its cryptographic hash — not by its location. This ensures verifiability and eliminates dependency on centralized naming authorities.",
  },
  {
    icon: Layers,
    title: "Composable Primitives",
    description: "Data objects are described by intrinsic attributes (size, media type, content digest) and can be composed into complex structures while maintaining referential integrity.",
  },
  {
    icon: Link2,
    title: "Semantic Interoperability",
    description: "The universal coordinate system bridges data formats and protocols, enabling seamless exchange between systems without custom integration layers.",
  },
  {
    icon: Zap,
    title: "Serverless & Decentralized",
    description: "Access data by what it is, not where it lives. UOR enables truly decentralized, serverless infrastructure without sacrificing security or determinism.",
  },
];

const Standard = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The UOR Standard
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            An open standard for structured, composable data — identified by content, not location.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
              A Rosetta Stone for Data
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed">
              Every piece of data — referenced, trusted, and composed like code. UOR treats everything as an object, uniquely identified by its intrinsic attributes.
            </p>
          </div>

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
