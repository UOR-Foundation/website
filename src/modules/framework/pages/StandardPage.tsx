import Layout from "@/modules/core/components/Layout";
import { ExternalLink, Globe, ShieldCheck, Bot, Microscope, Layers, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { applications } from "@/data/applications";
import { quantumLevels } from "@/data/quantum-levels";
import { closureModes } from "@/data/closure-modes";
import { signatureOps } from "@/data/signature-ops";
import { GITHUB_FRAMEWORK_URL, GITHUB_FRAMEWORK_DOCS_URL, GITHUB_PRISM_URL } from "@/data/external-links";
import UORDiagram from "@/modules/framework/components/UORDiagram";
import FrameworkLayers from "@/modules/framework/components/FrameworkLayers";

const iconMap: Record<string, LucideIcon> = { Globe, ShieldCheck, Bot, Microscope, Layers, Rocket };

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
            One address per object, derived from its content, verifiable across every system. Data referenced by what it is, not where it lives.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
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
              UOR replaces location based identity with <span className="text-foreground font-medium">identity based on content</span>. Every object gets a single, permanent address derived from what it contains. Same content, same address, across every system, forever.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Diagram */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-12">
            How It Works
          </p>
          <UORDiagram />
        </div>
      </section>

      {/* Anatomy of an Address */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Anatomy of an Address
          </p>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            Every piece of data in UOR is described by three coordinates. Together, they tell you everything about what the data is, how complex it is, and what it is made of.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 1</p>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">The Value</h3>
              <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed mb-4">
                The raw data itself, stored as a sequence of bytes. This is the "what": the actual content being addressed.
              </p>
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                <p className="font-mono text-xs text-muted-foreground mb-1">Example: the number 85</p>
                <p className="font-mono text-sm text-foreground font-semibold">01010101</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 2</p>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">The Weight</h3>
              <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed mb-4">
                How many "active" bits are in the value. This is a measure of complexity: a weight of 0 means empty, a weight of 8 means fully packed.
              </p>
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                <p className="font-mono text-xs text-muted-foreground mb-1">85 has four 1-bits</p>
                <p className="font-mono text-sm text-foreground font-semibold">Weight: 4</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 3</p>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">The Components</h3>
              <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed mb-4">
                Which specific building blocks make up the value. This lets you reconstruct the original from its parts, with nothing lost.
              </p>
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                <p className="font-mono text-xs text-muted-foreground mb-1">Active positions</p>
                <p className="font-mono text-sm text-foreground font-semibold">Positions: 0, 2, 4, 6</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70 font-body leading-relaxed mt-6 max-w-2xl">
            These three pieces together form a complete fingerprint. Given any two of them, you can derive the third. This is what makes UOR addresses self-verifying: the data proves its own identity.
          </p>
        </div>
      </section>

      {/* The Core Guarantee */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            The Core Guarantee
          </p>
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              Why the system is complete
            </h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              UOR is built on two simple, reversible operations: flipping the sign and flipping the bits. A key discovery is that applying both in sequence always produces the next number in the sequence.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 max-w-2xl">
            <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4">Worked Example</p>
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-base font-body text-foreground leading-relaxed">
                  Start with any number, say <span className="font-mono font-semibold">42</span>.
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-base font-body text-foreground leading-relaxed">
                  Flip every bit: <span className="font-mono font-semibold">42 → 213</span>.
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-base font-body text-foreground leading-relaxed">
                  Flip the sign: <span className="font-mono font-semibold">213 → 43</span>.
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
                <p className="text-base font-body text-foreground leading-relaxed">
                  Result: <span className="font-mono font-semibold">43 = 42 + 1</span>. Always the next number.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">Why this matters:</span> because these two operations always produce the next number, you can reach every possible value by repeating them. No value is unreachable, which means the system can represent anything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scaling */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Scale
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            From small to infinite
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            UOR starts with the simplest possible unit, one byte, and scales by adding more. Every level uses the same rules. What works at level 0 works at every level above it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quantumLevels.map((q) => (
              <div
                key={q.quantum}
                className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
                <p className="font-mono text-xs font-semibold text-primary/60 mb-2">{q.label} · {q.bits}-bit</p>
                <p className="font-display text-xl font-bold text-foreground mb-2">{q.states}</p>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">{q.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground/70 font-body leading-relaxed mt-6 max-w-2xl">
            The pattern continues: Q4 is 40-bit, Q5 is 48-bit, and so on. There is no upper limit. The same guarantees hold at every level.
          </p>
        </div>
      </section>

      {/* Operations */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            The Building Blocks
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Five operations. That is the entire vocabulary.
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            Every computation in UOR is expressed using exactly five operations. No more are needed. Every possible transformation of data can be described using combinations of these five.
          </p>
          <div className="space-y-3">
            {signatureOps.map((op) => (
              <div
                key={op.name}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-start gap-4"
              >
                <div className="shrink-0 sm:w-32">
                  <p className="font-display text-base font-bold text-foreground">{op.label}</p>
                  <p className="text-xs font-body text-muted-foreground/60 mt-0.5">{op.arity}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed">{op.plain}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {op.properties.map((prop) => (
                      <span key={prop} className="text-xs font-body font-medium text-primary/70 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
                        {prop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Similarity */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Measuring Similarity
          </p>
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              How close are two pieces of data?
            </h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              UOR compares any two objects by counting the number of bits where they differ. Identical data scores 1.0. Completely opposite data scores 0.0. This gives every comparison a precise, mathematical similarity score.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 max-w-2xl">
            <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4">Example</p>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Object A</span>
                <span className="text-foreground font-semibold">01010101</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Object B</span>
                <span className="text-foreground font-semibold">01010100</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Differing bits</span>
                <span className="text-foreground font-semibold">1 out of 8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Similarity</span>
                <span className="text-primary font-bold text-base">87.5%</span>
              </div>
            </div>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mt-5">
              This works on any data, at any scale. Because it is based on the actual content, not on labels or metadata, the score is objective and cannot be manipulated.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Levels (Closure Modes) */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Trust Levels
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Choose how thorough you need to be
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            When exploring connected data, you can choose how deep to go. Each level gives you a stronger guarantee, at the cost of more computation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {closureModes.map((mode, i) => (
              <div
                key={mode.name}
                className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">{mode.label}</h3>
                </div>
                <p className="text-sm font-body text-muted-foreground leading-relaxed mb-3">{mode.description}</p>
                <p className="text-xs font-body text-primary/70 font-medium leading-relaxed">
                  Best for: {mode.useCase}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Where It Applies
          </p>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-12">
            When every system shares one way to address data, new capabilities emerge.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((item) => {
              const Icon = iconMap[item.iconKey];
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
                >
                  {Icon && <Icon size={20} className="text-primary mb-4" />}
                  <h3 className="font-display text-base md:text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              );
            })}
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
            14 namespaces · 82 classes · 124 properties · 14 named individuals. Open source and fully documented.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Browse the Ontology
              <ExternalLink size={15} />
            </a>
            <a
              href={GITHUB_PRISM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              Try Prism
              <ExternalLink size={15} />
            </a>
            <a
              href={GITHUB_FRAMEWORK_URL}
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
