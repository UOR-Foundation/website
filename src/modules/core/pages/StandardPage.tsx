import Layout from "@/modules/core/components/Layout";
import { ExternalLink, BookOpen, Layers, Rocket, Globe, ShieldCheck, Bot, Microscope, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { applications } from "@/data/applications";
import { frameworkLayers } from "@/data/framework-layers";
import { GITHUB_FRAMEWORK_URL, GITHUB_FRAMEWORK_DOCS_URL, CRATE_URL, CRATE_DOCS_URL } from "@/data/external-links";

const appIconMap: Record<string, LucideIcon> = { Globe, ShieldCheck, Bot, Microscope, Layers, Rocket };

const gettingStarted = [
  {
    icon: BookOpen,
    title: "Overview",
    description: "What UOR is, what problem it solves, and how content-derived addressing works.",
    url: `${GITHUB_FRAMEWORK_DOCS_URL}docs/overview.html`,
  },
  {
    icon: Layers,
    title: "Architecture",
    description: "Six layers, from mathematical foundation to lossless data transformation.",
    url: `${GITHUB_FRAMEWORK_DOCS_URL}docs/architecture.html`,
  },
  {
    icon: Rocket,
    title: "Quick Start",
    description: "Clone the repo, run the core identity proof, and explore the API.",
    url: GITHUB_FRAMEWORK_URL,
  },
];

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-48 md:pt-64 pb-20 md:pb-32">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            The Framework
          </h1>
          <p
            className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-3xl"
            style={{ animationDelay: "0.12s" }}
          >
            Everything you need to understand, evaluate, and build with the UOR Framework.
          </p>
          <div
            className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.3s" }}
          >
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              Read the Docs
              <ExternalLink size={14} />
            </a>
            <a
              href={GITHUB_FRAMEWORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              View on GitHub
            </a>
            <a
              href={CRATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              <Package size={14} />
              Rust Crate
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Getting Started
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg">
            Start here
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gettingStarted.map((item) => (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
                <item.icon size={20} className="text-primary mb-4" />
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">
                  {item.description}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-fluid-label font-body font-medium text-primary/70 group-hover:text-primary transition-colors">
                  Read more
                  <ExternalLink size={13} className="opacity-60" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Key Concepts. simplified layer index */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Key Concepts
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-2">
            Framework Layers
          </h2>
          <p className="text-foreground/70 font-body text-fluid-body leading-relaxed max-w-3xl mb-golden-lg">
            Six layers, each building on the one below. Together they handle naming, discovery, verification, and transformation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {frameworkLayers.map((layer) => (
              <div
                key={layer.number}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
                <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
                  Layer {layer.number}
                </span>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mt-1 mb-2 group-hover:text-primary transition-colors">
                  {layer.title}
                </h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">
                  {layer.summary}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4">
                  <a
                    href={layer.namespaces[0]?.url ?? GITHUB_FRAMEWORK_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-primary/70 hover:text-primary transition-colors"
                  >
                    View docs
                    <ExternalLink size={13} className="opacity-60" />
                  </a>
                  {layer.crateModules.length > 0 && (
                    <a
                      href={layer.crateModules[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/40 hover:text-primary transition-colors"
                    >
                      <Package size={12} className="opacity-60" />
                      Rust traits
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where It Applies */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Where It Applies
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg">
            Use Cases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((item) => {
              const Icon = appIconMap[item.iconKey];
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  {Icon && <Icon size={20} className="text-primary mb-4" />}
                  <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-section-sm">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-6xl text-center">
          <h2 className="font-display text-fluid-heading font-bold mb-4">
            Explore the Full Specification
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-fluid-body leading-relaxed max-w-xl mx-auto mb-10">
            The full specification is open source. Read it, fork it, build on it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Read the Specification
              <ExternalLink size={15} />
            </a>
            <a
              href={GITHUB_FRAMEWORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              View on GitHub
            </a>
            <a
              href={CRATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              <Package size={15} />
              Rust Crate
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
