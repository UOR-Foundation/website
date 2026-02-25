/**
 * Sandbox — Full Project Exploration Page
 * 
 * A visually striking, curiosity-driven showcase of every UOR ecosystem project.
 * Designed for clarity, impact, and exploration.
 */

import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, ChevronRight, Sparkles, Layers, Cpu, Code2, Globe } from "lucide-react";
import { projects as projectsData, maturityInfo, type MaturityLevel, type ProjectData } from "@/data/projects";

import projectHologramImg from "@/assets/project-hologram.jpg";
import projectAtlasImg from "@/assets/project-atlas.png";
import projectAtomicLangImg from "@/assets/project-atomic-lang.jpg";
import projectPrismImg from "@/assets/project-prism.png";
import projectUorMcpImg from "@/assets/project-uor-mcp.jpg";
import projectUnsImg from "@/assets/project-uns.jpg";
import projectQrCartridgeImg from "@/assets/project-qr-cartridge.jpg";
import projectHologramSdkImg from "@/assets/project-hologram-sdk.jpg";
import projectUorIdentityImg from "@/assets/project-uor-identity.jpg";
import projectUorPrivacyImg from "@/assets/project-uor-privacy.jpg";
import projectUorCertificateImg from "@/assets/project-uor-certificate.jpg";

const imageMap: Record<string, string> = {
  hologram: projectHologramImg,
  atlas: projectAtlasImg,
  atomicLang: projectAtomicLangImg,
  prism: projectPrismImg,
  uorMcp: projectUorMcpImg,
  uns: projectUnsImg,
  qrCartridge: projectQrCartridgeImg,
  hologramSdk: projectHologramSdkImg,
  uorIdentity: projectUorIdentityImg,
  uorPrivacy: projectUorPrivacyImg,
  uorCertificate: projectUorCertificateImg,
};

type Project = ProjectData & { image?: string };

const allProjects: Project[] = projectsData.map(p => ({
  ...p,
  image: p.imageKey ? imageMap[p.imageKey] : undefined,
}));

const categoryIcons: Record<string, typeof Sparkles> = {
  "Frontier Technology": Cpu,
  "Open Science": Sparkles,
  "Core Infrastructure": Layers,
  "Developer Tools": Code2,
};

const maturityBadge: Record<MaturityLevel, string> = {
  Graduated: "bg-primary/15 text-primary border-primary/20",
  Incubating: "bg-accent/15 text-accent border-accent/20",
  Sandbox: "bg-muted text-muted-foreground border-border",
};

const SandboxPage = () => {
  const categories = [...new Set(allProjects.map(p => p.category))];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-32 md:pt-52 pb-20 md:pb-28">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe size={20} className="text-primary" />
            </div>
            <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground font-body">
              UOR Ecosystem
            </span>
          </div>
          <h1
            className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.08] text-balance animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            Explore every project building on the universal standard
          </h1>
          <p
            className="mt-8 text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            From frontier computing to open science — each project is an independent team 
            building on one shared, verifiable foundation. Pick any card to go deeper.
          </p>
          <div
            className="mt-10 flex flex-wrap gap-4 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.4s" }}
          >
            <Link to="/projects" className="btn-primary inline-flex items-center gap-2">
              Project Maturity Framework <ArrowRight size={16} />
            </Link>
            <Link to="/projects#submit" className="btn-outline inline-flex items-center gap-2">
              Submit Your Project
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border bg-card">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { label: "Total Projects", value: allProjects.length },
              { label: "Categories", value: categories.length },
              { label: "Open Source", value: "100%" },
              { label: "Maturity Tiers", value: maturityInfo.length },
            ].map((stat) => (
              <div key={stat.label} className="py-8 md:py-10 px-6 text-center">
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-body mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Projects Grid */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container max-w-6xl">
          {categories.map((category, catIdx) => {
            const CategoryIcon = categoryIcons[category] || Globe;
            const categoryProjects = allProjects.filter(p => p.category === category);

            return (
              <div key={category} className="mb-20 last:mb-0">
                <div
                  className="flex items-center gap-3 mb-10 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${catIdx * 0.08}s` }}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CategoryIcon size={18} className="text-primary" />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {category}
                  </h2>
                  <span className="text-sm text-muted-foreground font-body ml-2">
                    {categoryProjects.length} {categoryProjects.length === 1 ? "project" : "projects"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {categoryProjects.map((project, index) => (
                    <Link
                      key={project.slug}
                      to={`/projects/${project.slug}`}
                      className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up opacity-0 flex flex-col"
                      style={{ animationDelay: `${(catIdx * 0.08) + (index * 0.06)}s` }}
                    >
                      {project.image && (
                        <div className="w-full h-56 md:h-64 overflow-hidden relative">
                          <img
                            src={project.image}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      <div className="p-7 md:p-9 flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body">
                            {project.category}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border font-body ${maturityBadge[project.maturity]}`}>
                            {project.maturity}
                          </span>
                        </div>
                        <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-200">
                          {project.name}
                        </h3>
                        <p className="text-muted-foreground font-body text-base leading-relaxed flex-1">
                          {project.description}
                        </p>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-primary text-sm font-medium font-body group-hover:gap-2.5 transition-all duration-200">
                            Explore <ChevronRight size={14} />
                          </span>
                          {project.url && (
                            <span
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(project.url, "_blank");
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Build on the universal standard
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Every project in this ecosystem is open source, independently maintained, and built on one shared mathematical foundation. Your project could be next.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/projects#submit" className="btn-primary inline-flex items-center gap-2">
              Submit Your Project <ArrowRight size={16} />
            </Link>
            <Link to="/projects" className="btn-outline inline-flex items-center gap-2">
              View Maturity Framework
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SandboxPage;
