import Layout from "@/modules/core/components/Layout";
import { ExternalLink, Globe, ShieldCheck, Bot, Microscope, Layers, Rocket, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { applications } from "@/data/applications";
import { GITHUB_FRAMEWORK_URL, GITHUB_FRAMEWORK_DOCS_URL, GITHUB_PRISM_URL } from "@/data/external-links";
import UORDiagram from "@/modules/framework/components/UORDiagram";
import FrameworkLayers from "@/modules/framework/components/FrameworkLayers";

const iconMap: Record<string, LucideIcon> = { Globe, ShieldCheck, Bot, Microscope, Layers, Rocket };

const Standard = () => {
  return (
    <Layout>
      {/* Hero — absorbs "The Problem" */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            The UOR Framework
          </h1>
          <p
            className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl"
            style={{ animationDelay: "0.15s" }}
          >
            The open specification for how UOR addressing works. If you're building on UOR or evaluating it for your project, start here.
          </p>
          <div
            className="mt-12 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
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

      {/* Content A: How It Works — Diagram + Anatomy merged */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-8">
            How It Works
          </p>
          <UORDiagram />

          {/* Anatomy of an Address — inline */}
          <div className="mt-golden-lg pt-golden-lg border-t border-border/40">
            <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
              Anatomy of an Address
            </p>
            <p className="text-foreground/70 font-body text-fluid-body leading-relaxed max-w-4xl mb-8">
              Every piece of data in UOR is described by three coordinates that form a complete, self-verifying fingerprint.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 1</p>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">The Value</h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                  The data itself — a document, a number, a record. This is the "what."
                </p>
                <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                  <p className="font-mono text-fluid-caption text-foreground/50 mb-1">Example</p>
                  <p className="font-mono text-fluid-label text-foreground font-semibold">Document, number, or any content</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 2</p>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">The Weight</h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                  A measure of the data's complexity — how much information it contains.
                </p>
                <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                  <p className="font-mono text-fluid-caption text-foreground/50 mb-1">Example</p>
                  <p className="font-mono text-fluid-label text-foreground font-semibold">Complexity score: 4</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">Coordinate 3</p>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">The Components</h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed mb-4">
                  The building blocks that make up the data, enabling exact reconstruction.
                </p>
                <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                  <p className="font-mono text-fluid-caption text-foreground/50 mb-1">Example</p>
                  <p className="font-mono text-fluid-label text-foreground font-semibold">4 distinct building blocks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content B: Architecture & Applications merged */}
      <section id="architecture" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
            Architecture
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-4">
            Framework Architecture
          </h2>
          <p className="text-foreground/70 font-body text-fluid-body leading-relaxed max-w-4xl mb-golden-lg">
            Six layers, each building on the one below it. Together they form a complete system for naming, finding, proving, and transforming data.
          </p>
          <FrameworkLayers />

          {/* Applications inline */}
          <div className="mt-golden-lg pt-golden-lg border-t border-border/40">
            <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
              Where It Applies
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {applications.map((item) => {
                const Icon = iconMap[item.iconKey];
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
                  >
                    {Icon && <Icon size={20} className="text-primary mb-4" />}
                    <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">{item.text}</p>
                  </div>
                );
              })}
            </div>
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
              href={GITHUB_PRISM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              Try Prism
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
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
