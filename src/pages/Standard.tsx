import Layout from "@/components/Layout";
import UORDiagram from "@/components/UORDiagram";
import FrameworkLayers from "@/components/FrameworkLayers";
import { ExternalLink } from "lucide-react";

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
            A universal, content-addressed coordinate system for information built on symbolic and geometric foundations. One address per object, verifiable, composable, and permanent.
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

      {/* One-liner explanation */}
      <section className="section-dark py-12 md:py-20">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/80 mb-6">
            The Problem
          </p>
          <div className="h-px w-full bg-section-dark-foreground/10" />
          <div
            className="py-12 md:py-16 max-w-3xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            <p className="text-section-dark-foreground/90 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9] font-medium">
              Today's data lives in silos. Different formats, protocols, and systems that can't natively understand each other.
            </p>
            <p className="mt-6 text-section-dark-foreground/65 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
              UOR replaces location-based identity with <span className="text-section-dark-foreground font-medium">symbolic, content-based identity</span>. Every object gets a single, permanent address derived from what it contains. Same content, same address, across every system, forever.
            </p>
          </div>
          <div className="h-px w-full bg-section-dark-foreground/10" />
        </div>
      </section>

      {/* Visual Diagram */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-5xl">
          <UORDiagram />
        </div>
      </section>

      {/* Framework Architecture */}
      <section id="architecture" className="py-16 md:py-28 bg-background border-t border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Framework Architecture
          </h2>
          <p className="text-muted-foreground font-body text-center max-w-2xl mx-auto mb-14 md:mb-16 leading-relaxed">
            Five layers built on symbolic representation and geometric structure. Each builds on the one below it.
          </p>
          <FrameworkLayers />
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Explore the Full Specification
          </h2>
          <p className="text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto mb-10">
            14 namespaces · 82 classes · 119 properties. Open-source and fully documented.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="https://uor-foundation.github.io/UOR-Framework/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              Browse the Ontology
              <ExternalLink size={16} />
            </a>
            <a
              href="https://github.com/UOR-Foundation/UOR-Framework"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground hover:text-section-dark"
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
