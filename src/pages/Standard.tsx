import Layout from "@/components/Layout";
import { Shield, Layers, Link2, Zap, Hash, GitBranch, ExternalLink } from "lucide-react";

const principles = [
  {
    icon: Hash,
    title: "Content-Addressed Identity",
    description: "Every object is identified by a cryptographic hash of its content — not by where it lives. Same content, same address, everywhere.",
  },
  {
    icon: Layers,
    title: "Algebraic Composability",
    description: "Intrinsic attributes compose into complex structures through formal algebraic operations while preserving referential integrity at every level.",
  },
  {
    icon: Link2,
    title: "Semantic Interoperability",
    description: "Bridges data formats, protocols, and systems. No custom integration layers — objects carry their own meaning across boundaries.",
  },
  {
    icon: Zap,
    title: "Decentralized by Design",
    description: "No central authority, no single point of failure. Access data by what it is, not where it is. Deterministic without centralization.",
  },
];

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The UOR Standard
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            A universal, content-addressed coordinate system for information. One address per object — verifiable, composable, and permanent.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href="https://github.com/UOR-Foundation/UOR-Framework"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Read the Specification
            </a>
            <a href="#how-it-works" className="btn-outline">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* What It Is */}
      <section className="section-dark py-12 md:py-20">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/80 mb-6">
            What UOR Is
          </p>
          <div className="h-px w-full bg-section-dark-foreground/10" />
          <div
            className="py-12 md:py-16 max-w-3xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            <p className="text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
              <span className="text-section-dark-foreground font-medium">
                Universal Object Reference (UOR) is a formal ontology for content-addressed, algebraically-structured object spaces.
              </span>{" "}
              It assigns every piece of digital content a unique, permanent identifier based on what it contains — not where it is stored.
            </p>
            <p className="mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
              When two systems hold the same content, they resolve to the same identifier. No translation layers. No broken references. Direct verification and reliable reuse across any system.
            </p>
            <p className="mt-8 text-section-dark-foreground/90 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9] font-medium">
              The result: a single, universal coordinate system that humans and machines can use to locate, verify, and compose any piece of information — deterministically.
            </p>
          </div>
          <div className="h-px w-full bg-section-dark-foreground/10" />
        </div>
      </section>

      {/* How It Works — Core Principles */}
      <section id="how-it-works" className="py-16 md:py-28 bg-background scroll-mt-28">
        <div className="container max-w-5xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Core Principles
          </h2>
          <p className="text-muted-foreground font-body text-center max-w-2xl mx-auto mb-14 md:mb-16 leading-relaxed">
            Four design principles that make UOR a trustworthy foundation for the semantic web, open science, and frontier AI.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {principles.map((p, index) => (
              <div
                key={p.title}
                className="group bg-card rounded-2xl border border-border p-7 md:p-9 animate-fade-in-up hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                  <p.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-3">
                  {p.title}
                </h3>
                <p className="text-muted-foreground font-body text-base leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 md:py-28 bg-background border-t border-border">
        <div className="container max-w-5xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Why It Matters
          </h2>
          <p className="text-muted-foreground font-body text-center max-w-2xl mx-auto mb-14 md:mb-16 leading-relaxed">
            Location-based systems break. Content-based identity doesn't.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Trust Without Middlemen",
                description: "Verify any object by its content hash. No certificates, no central registries, no single point of failure.",
              },
              {
                icon: GitBranch,
                title: "Eliminate Integration Debt",
                description: "Objects carry their own semantics. Systems interoperate natively — no adapters, no format wars, no lock-in.",
              },
              {
                icon: ExternalLink,
                title: "Future-Proof by Construction",
                description: "Content addresses never expire. Data remains findable and verifiable regardless of where infrastructure moves.",
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-7 md:p-10 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <item.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-base text-muted-foreground font-body leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Explore the Framework
          </h2>
          <p className="text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto mb-10">
            The full UOR specification — ontology, namespaces, and implementation guides — is open-source and available on GitHub.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="https://github.com/UOR-Foundation/UOR-Framework"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              View on GitHub
            </a>
            <a
              href="https://uor-foundation.github.io/UOR-Framework/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground hover:text-section-dark"
            >
              Browse the Ontology
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
