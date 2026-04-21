/**
 * Sandbox. Full Project Exploration Page
 * 
 * A visually striking, curiosity-driven showcase of every UOR ecosystem project.
 * Designed for clarity, impact, and exploration.
 */

import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Layers, Cpu, Code2, Globe } from "lucide-react";
import { projects as allProjects, maturityInfo } from "@/data/projects";
import ProjectCard from "@/modules/projects/components/ProjectCard";

const categoryIcons: Record<string, typeof Sparkles> = {
  "Frontier Technology": Cpu,
  "Open Science": Sparkles,
  "Core Infrastructure": Layers,
  "Developer Tools": Code2,
};

const SandboxPage = () => {
  const categories = [...new Set(allProjects.map(p => p.category))];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe size={20} className="text-primary" />
            </div>
            <span className="text-sm font-medium tracking-widest uppercase text-foreground/70 font-body">
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
            className="mt-8 text-lg md:text-xl text-foreground/70 font-body leading-relaxed max-w-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            Each project is an independent team building on one shared, verifiable foundation. Pick any card to go deeper.
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
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { label: "Total Projects", value: allProjects.length },
              { label: "Categories", value: categories.length },
              { label: "Open Source", value: "100%" },
              { label: "Maturity Tiers", value: maturityInfo.length },
            ].map((stat) => (
              <div key={stat.label} className="py-8 md:py-10 px-6 text-center">
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-foreground/70 font-body mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Projects Grid */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
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
                  <span className="text-sm text-foreground/70 font-body ml-2">
                    {categoryProjects.length} {categoryProjects.length === 1 ? "project" : "projects"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {categoryProjects.map((project, index) => (
                    <ProjectCard
                      key={project.slug}
                      project={project}
                      className="animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${(catIdx * 0.08) + (index * 0.06)}s`, animationFillMode: "forwards" }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-20 md:py-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] text-center">
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
