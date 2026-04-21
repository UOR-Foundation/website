import Layout from "@/modules/core/components/Layout";
import { ExternalLink, Layers, Globe, ShieldCheck, Bot, Microscope, Rocket, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { applications } from "@/data/applications";
import { frameworkLayers } from "@/data/framework-layers";
import { GITHUB_FRAMEWORK_URL, GITHUB_FRAMEWORK_DOCS_URL, CRATE_URL, CRATE_DOCS_URL } from "@/data/external-links";
import {
  canonicalSpecs,
  CRATE_VERSION,
  installSnippet,
  hostTypesSnippet,
  principalPathSnippet,
} from "@/data/canonical-sources";

const appIconMap: Record<string, LucideIcon> = { Globe, ShieldCheck, Bot, Microscope, Layers, Rocket };

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-48 md:pt-64 pb-20 md:pb-32">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            Specifications
          </h1>
          <p
            className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-3xl"
            style={{ animationDelay: "0.12s" }}
          >
            Make data identity universal. UOR currently contains three specifications — Identity, Object, and Resolution — each anchored in a published module of the canonical{" "}
            <a href={CRATE_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-foreground/90 hover:text-primary transition-colors">uor-foundation</a> Rust crate (v{CRATE_VERSION}).
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

      {/* The Three Specifications — spec hub */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            The Three Specifications
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg">
            One canonical crate. Three specifications.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {canonicalSpecs.map((spec) => (
              <div
                key={spec.id}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[11px] tracking-tight text-foreground/55">
                    uor_foundation::{spec.module}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border font-body ${
                      spec.status === "Stable"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {spec.status}
                  </span>
                </div>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">
                  {spec.name}
                </h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed flex-1">
                  {spec.oneLine}
                </p>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
                  <a
                    href={spec.crate.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-primary/80 hover:text-primary transition-colors"
                  >
                    docs.rs
                    <ExternalLink size={12} className="opacity-70" />
                  </a>
                  <a
                    href={`${spec.repo.url}/tree/main/${spec.repo.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/55 hover:text-primary transition-colors"
                  >
                    Source
                    <ExternalLink size={12} className="opacity-70" />
                  </a>
                  {spec.tsMirror && (
                    <span className="font-mono text-[11px] text-foreground/40">
                      ↳ {spec.tsMirror}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started — verbatim snippets from the canonical crate */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Getting Started
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-2">
            Three steps. Verbatim from the crate.
          </h2>
          <p className="text-foreground/70 font-body text-fluid-body leading-relaxed max-w-3xl mb-golden-lg">
            Every snippet is taken directly from the published <code className="font-mono text-foreground/90">uor-foundation</code> v{CRATE_VERSION} documentation. No paraphrased pseudocode.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            {/* 1. Install */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[11px] text-foreground/55">01</span>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground">Install</h3>
              </div>
              <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                Add the canonical crate to your Cargo manifest.
              </p>
              <pre className="flex-1 rounded-xl bg-foreground/[0.04] border border-border/60 p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed text-foreground/85">
{installSnippet}
              </pre>
              <a
                href={CRATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/55 hover:text-primary transition-colors"
              >
                from crates.io / Quick start
                <ExternalLink size={12} className="opacity-70" />
              </a>
            </div>

            {/* 2. Bind HostTypes */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[11px] text-foreground/55">02</span>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground">Bind HostTypes</h3>
              </div>
              <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                Choose representations for the host environment.
              </p>
              <pre className="flex-1 rounded-xl bg-foreground/[0.04] border border-border/60 p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed text-foreground/85">
{hostTypesSnippet}
              </pre>
              <a
                href={`${CRATE_DOCS_URL}/${CRATE_VERSION}/uor_foundation/#hosttypes-target-41-w10`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/55 hover:text-primary transition-colors"
              >
                from docs.rs / HostTypes
                <ExternalLink size={12} className="opacity-70" />
              </a>
            </div>

            {/* 3. Run the principal data path */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[11px] text-foreground/55">03</span>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground">Principal data path</h3>
              </div>
              <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                The single sanctioned path from host bytes to a certified triad.
              </p>
              <pre className="flex-1 rounded-xl bg-foreground/[0.04] border border-border/60 p-4 overflow-x-auto text-[11.5px] font-mono leading-relaxed text-foreground/85 whitespace-pre">
{principalPathSnippet}
              </pre>
              <a
                href={`${CRATE_DOCS_URL}/${CRATE_VERSION}/uor_foundation/#principal-data-path`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/55 hover:text-primary transition-colors"
              >
                from docs.rs / Principal data path
                <ExternalLink size={12} className="opacity-70" />
              </a>
            </div>
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
