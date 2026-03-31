import { useState } from "react";
import { Linkedin, BookOpen, Users, Rocket, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Layout from "@/modules/core/components/Layout";
import { governanceBoard } from "@/data/governance";
import { whatWeDoCards } from "@/data/about-cards";
import { GITHUB_GOVERNANCE_URL, GITHUB_DOTGITHUB_URL } from "@/data/external-links";

const cardIconMap: Record<string, LucideIcon> = { BookOpen, Users, Rocket };

/** Compact governance strip — overlapping avatars with click-to-reveal detail */
const GovernanceBoardStrip = () => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx !== null ? governanceBoard[activeIdx] : null;

  return (
    <div>
      <div className="h-px w-full bg-border/40 mb-6 md:mb-8" />
      <div className="mb-5 md:mb-6">
        <h2
          className="font-display text-2xl md:text-3xl font-semibold text-foreground animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s" }}
        >
          Governance Board
        </h2>
        <p
          className="text-muted-foreground font-body text-sm mt-1 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          Five-member board · three-year terms ·{" "}
          <a
            href="https://github.com/UOR-Foundation/.github"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            charter on GitHub
          </a>
        </p>
      </div>

      {/* Avatar row + inline detail */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center">
          {governanceBoard.map((member, idx) => (
            <button
              key={member.name}
              onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
              className={`relative rounded-full border-[3px] transition-all duration-300 focus:outline-none
                ${idx > 0 ? "-ml-3 md:-ml-4" : ""}
                ${activeIdx === idx
                  ? "border-primary z-20 scale-110 shadow-lg shadow-primary/20"
                  : "border-background z-10 hover:z-20 hover:scale-105 hover:border-primary/40"
                }`}
              style={{ zIndex: activeIdx === idx ? 20 : 10 - idx }}
              aria-label={member.name}
            >
              <img
                src={member.image}
                alt={member.name}
                className={`w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] rounded-full object-cover object-top transition-all duration-500
                  ${activeIdx === idx ? "grayscale-0" : "grayscale hover:grayscale-0"}`}
                loading="lazy"
              />
            </button>
          ))}

          {/* Community count pill */}
          <div className="-ml-3 md:-ml-4 z-0 w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] rounded-full border-[3px] border-background bg-muted flex items-center justify-center">
            <span className="text-xs md:text-sm font-semibold text-muted-foreground">+42</span>
          </div>
        </div>

        {/* Inline detail card */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            active ? "max-h-40 opacity-100" : "max-h-0 sm:max-h-40 opacity-0 pointer-events-none"
          }`}
        >
          {active && (
            <a
              href={active.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-base font-semibold text-foreground">{active.name}</span>
                  <Linkedin size={12} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-medium text-primary">{active.role}</span>
                {active.bio && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-[20rem]">
                    {active.bio}
                  </p>
                )}
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-28 md:pt-36 pb-8 md:pb-12">
        <div className="container max-w-6xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground animate-fade-in-up">
            About
          </h1>
          <p
            className="mt-5 text-muted-foreground font-body text-base leading-[1.7] max-w-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            A 501(c)(3) nonprofit building open infrastructure for reliable, verifiable data. We maintain the specification, support a global research community, and guide projects from idea to production.
          </p>
        </div>
      </section>

      <section className="py-8 md:py-14 bg-background">
        <div className="container max-w-6xl space-y-8 md:space-y-12">

          {/* What We Do */}
          <div>
            <div className="h-px w-full bg-border/40 mb-6 md:mb-8" />
            <h2
              className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 md:mb-8 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s" }}
            >
              What We Do
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {whatWeDoCards.map((item, idx) => {
                const Icon = cardIconMap[item.iconKey];
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border/30 bg-card p-5 md:p-6 flex flex-col gap-3 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.25 + idx * 0.08}s` }}
                  >
                    {Icon && <Icon size={20} className="text-primary" strokeWidth={1.5} />}
                    <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-base text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Governance Board — compact community strip */}
          <GovernanceBoardStrip />

          {/* Resources */}
          <div>
            <div className="h-px w-full bg-border/40 mb-6 md:mb-8" />
            <h2
              className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 md:mb-8 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s" }}
            >
              Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {[
                { label: "Governance Charter", href: GITHUB_GOVERNANCE_URL },
                { label: "Code of Conduct", href: `${GITHUB_DOTGITHUB_URL}/blob/main/CODE_OF_CONDUCT.md` },
                { label: "Contributing Guide", href: `${GITHUB_DOTGITHUB_URL}/blob/main/CONTRIBUTING.md` },
                { label: "Organization on GitHub", href: GITHUB_DOTGITHUB_URL },
              ].map((link, idx) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 rounded-xl border border-border/30 bg-card hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-200 group animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.25 + idx * 0.06}s` }}
                >
                  <span className="text-base font-medium text-foreground font-body">{link.label}</span>
                  <ExternalLink size={15} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
