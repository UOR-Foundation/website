import Layout from "@/modules/core/components/Layout";
import UORDiagram from "@/modules/framework/components/UORDiagram";
import FrameworkLayers from "@/modules/framework/components/FrameworkLayers";
import { ExternalLink, Globe, ShieldCheck, Bot, Microscope, Layers, Rocket } from "lucide-react";

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The UOR Framework
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            One address per object, derived from its content, verifiable across every system. Data referenced by what it is, not where it lives. One shared language for all of it.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href="https://uor-foundation.github.io/UOR-Framework/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Browse the Framework
            </a>
            <a href="#architecture" className="btn-outline">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            The Problem
          </p>
          <div
            className="pt-8 md:pt-10 max-w-3xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            <p className="text-foreground font-body text-base md:text-lg leading-[1.85] md:leading-[1.9] font-medium">
              Today's data lives in silos. Different formats, protocols, and systems that can't natively understand each other.
            </p>
            <p className="mt-6 text-muted-foreground font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
              UOR replaces location based identity with <span className="text-foreground font-medium">symbolic, content based identity</span>. Every object gets a single, permanent address derived from what it contains. Same content, same address, across every system, forever.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Diagram */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            How It Works
          </p>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-12">
            UOR gives every object a permanent address based on what it contains, not where it is stored. Here is how that works.
          </p>
          <UORDiagram />
        </div>
      </section>

      {/* Applications */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Where It Applies
          </p>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-12">
            A single, shared way to address data opens the door to breakthroughs across disciplines.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Semantic Web", text: "Make data understandable by both people and machines, so systems can work together without custom translations.", icon: Globe },
              { title: "Proof Based Computation", text: "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it.", icon: ShieldCheck },
              { title: "Agentic AI", text: "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own.", icon: Bot },
              { title: "Open Science", text: "Make research data findable, reproducible, and composable across institutions and fields.", icon: Microscope },
              { title: "Cross Domain Unification", text: "Let different fields share data and ideas without losing meaning in translation. One shared system, many disciplines.", icon: Layers },
              { title: "Frontier Technologies", text: "Provide a foundation for emerging fields like quantum computing and next-generation AI, where reliable data identity is essential.", icon: Rocket },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
                <item.icon size={20} className="text-primary mb-4" />
                <h3 className="font-display text-base md:text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Framework Architecture */}
      <section id="architecture" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Architecture
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            UOR Framework Architecture
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-14 md:mb-16">
            Six layers, each building on the one below it. Together they form a complete system: from the ground rules, to naming, to finding, proving, and transforming data.
          </p>
          <FrameworkLayers />
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-14 md:py-20">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Explore the Full Specification
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            14 namespaces · 82 classes · 119 properties · 14 named individuals. Open source and fully documented.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="https://uor-foundation.github.io/UOR-Framework/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Browse the Ontology
              <ExternalLink size={15} />
            </a>
            <a
              href="https://github.com/UOR-Foundation/UOR-Framework"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
