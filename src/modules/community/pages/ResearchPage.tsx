import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, ExternalLink, ArrowRight, Cpu, Shield, Calculator, TrendingUp, Bot, Atom, BarChart3, HeartPulse, Globe, Microscope, Rocket, Leaf, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import blogFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";
import { researchCategories } from "@/data/research-categories";
import { blogPosts } from "@/data/blog-posts";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_RESEARCH_URL } from "@/data/external-links";

const iconMap: Record<string, LucideIcon> = {
  Calculator, Cpu, Shield, TrendingUp, Bot, Atom, BarChart3, HeartPulse, Globe, Microscope, Rocket, Leaf,
};

const coverMap: Record<string, string> = {
  knowledgeGraph: blogKnowledgeGraph,
  goldenSeed: blogGoldenSeed,
  frameworkLaunch: blogFrameworkLaunch,
};

import { categoryResearch } from "@/data/research-papers";
import { events } from "@/data/events";

const tagStyles: Record<string, string> = {
  "Open Research": "bg-primary/10 text-primary",
  Vision: "bg-accent/10 text-accent",
  Announcement: "bg-accent/10 text-accent",
  Community: "bg-primary/8 text-primary/80 border border-primary/15",
  Workshop: "bg-primary/10 text-primary",
  "Community Call": "bg-accent/10 text-accent",
  Conference: "bg-primary/8 text-primary/80 border border-primary/15",
};

const Research = () => {
  const [selectedCategory, setSelectedCategory] = useState("mathematics");
  const highlights = categoryResearch[selectedCategory] || [];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-28 md:pt-36 pb-8 md:pb-12">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            Our Community
          </h1>
          <p className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl" style={{ animationDelay: "0.15s" }}>
            Researchers and builders working across disciplines to test ideas, validate results, and publish openly. Progress is faster when it is shared.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#research" className="btn-primary">
              Explore Research
            </a>
            <a href="#join" className="btn-outline">
              Join the Community
            </a>
          </div>
        </div>
      </section>

      {/* Research */}
      <section id="research" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
            Open Research
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-4">
            Research Areas
          </h2>
          <p className="text-foreground/70 font-body text-fluid-body leading-relaxed max-w-4xl mb-8">
            Find your discipline, validate ideas, and collaborate on{" "}
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Discord</a>.
          </p>

          <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-3 mb-10 pb-2 sm:pb-0 -mx-1.5 px-1.5 sm:mx-0 sm:px-0 justify-start sm:justify-center scrollbar-hide">
            {researchCategories.map((cat, index) => {
              const isSelected = cat.slug === selectedCategory;
              const isDisabled = !cat.active;
              return (
                <button
                  key={cat.slug}
                  onClick={() => cat.active && setSelectedCategory(cat.slug)}
                  disabled={isDisabled}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 animate-fade-in-up text-fluid-label font-medium font-body whitespace-nowrap ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : isDisabled
                      ? "border-border/30 bg-card/40 text-foreground/45 cursor-default"
                      : "border-border bg-card hover:border-primary/25 hover:shadow-sm cursor-pointer text-foreground"
                  }`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  {(() => { const Icon = iconMap[cat.iconKey]; return Icon ? <Icon size={15} className={isSelected ? "text-primary" : isDisabled ? "text-foreground/40" : "text-primary"} /> : null; })()}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Research Highlights */}
          {highlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {highlights.map((item, index) => {
                const isInternal = item.href.startsWith("/");
                const CardWrapper = isInternal ? Link : "a";
                const linkProps = isInternal
                  ? { to: item.href }
                  : { href: item.href, target: "_blank", rel: "noopener noreferrer" };
                return (
                  <CardWrapper
                    key={item.title}
                    {...(linkProps as any)}
                    className="group flex flex-col rounded-xl border border-border bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-fluid-caption font-medium font-body ${
                        item.status === "Published" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-display text-fluid-body-sm font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-200">
                      {item.title}
                    </h3>
                    <p className="text-fluid-caption text-foreground/55 font-body mb-3">{item.authors}</p>
                    <p className="text-fluid-label text-foreground/70 font-body leading-relaxed flex-1">
                      {item.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-4 text-fluid-label font-medium text-foreground/45 group-hover:text-primary transition-colors duration-200 font-body">
                      View research <ArrowRight size={13} />
                    </span>
                  </CardWrapper>
                );
              })}

              {/* Submit Research CTA Card */}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] p-6 hover:border-primary/40 hover:bg-primary/[0.06] transition-all duration-300 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${highlights.length * 0.1}s` }}
              >
                <div className="w-9 h-9 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-4 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300">
                  <Plus size={16} className="text-primary/60 group-hover:text-primary transition-colors duration-200" />
                </div>
                <h3 className="font-display text-fluid-body-sm font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-200">
                  Submit Your Research
                </h3>
                <p className="text-fluid-label text-foreground/70 font-body leading-relaxed max-w-[240px]">
                  Share your work with the community for validation and collaboration.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-fluid-label font-medium text-primary/60 group-hover:text-primary transition-colors duration-200 font-body">
                  Submit now <ArrowRight size={13} />
                </span>
              </a>
            </div>
          )}

          <a
            href={GITHUB_RESEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-fluid-label font-medium text-primary hover:underline font-body transition-colors"
          >
            View our research on GitHub <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* Blog */}
      <section id="blog" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
            Blog
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Highlights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post, index) => (
              <Link
                key={post.title}
                to={post.href}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={coverMap[post.coverKey]}
                    alt={post.title}
                    className="w-full h-full object-contain bg-card transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-fluid-caption font-medium font-body ${tagStyles[post.tag]}`}>
                      {post.tag}
                    </span>
                    <span className="text-fluid-caption text-foreground/70 font-body">{post.date}</span>
                  </div>
                  <h3 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                    {post.title}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 mt-auto pt-4 text-fluid-label font-medium text-foreground/45 group-hover:text-primary transition-colors duration-200 font-body">
                    Read more <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-foreground/45 mb-3">
            Events
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Upcoming Events
          </h2>

          <div className="space-y-0">
            {events.map((event, index) => (
              <div
                key={event.title}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {index === 0 && <div className="h-px w-full bg-border" />}
                <div className="group py-8 md:py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-8 items-start transition-all duration-300 hover:pl-2">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-fluid-caption font-medium font-body ${tagStyles[event.type]}`}>
                        {event.type}
                      </span>
                    </div>
                    <h3 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                      {event.title}
                    </h3>
                    <p className="text-foreground/70 font-body text-fluid-body leading-relaxed">
                      {event.location}
                      {event.link && (
                        <>
                          {" · "}
                          <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                            Join on Discord
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 md:mt-1">
                    <span className="text-fluid-label font-medium text-foreground/55 font-body flex items-center gap-2">
                      <Calendar size={14} />
                      {event.date}
                    </span>
                    {event.calendarDate && (
                      <a
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.calendarDate}&details=${encodeURIComponent(event.link ? `Join on Discord: ${event.link}` : '')}&location=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fluid-caption font-medium text-primary hover:underline font-body flex items-center gap-1.5"
                      >
                        <ExternalLink size={11} />
                        Add to Calendar
                      </a>
                    )}
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join" className="section-dark py-section-sm scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-6xl text-center">
          <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-6">
            Get Involved
          </p>
          <h2 className="font-display text-fluid-heading font-bold mb-6">
            Join the Community
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-fluid-body leading-relaxed max-w-xl mx-auto mb-10">
            Connect with us on Discord, contribute on GitHub, or attend an upcoming event.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Join Our Discord
            </a>
            <a
              href={GITHUB_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              Contribute on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;
