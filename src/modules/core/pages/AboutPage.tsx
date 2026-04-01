import { Linkedin, BookOpen, Users, Rocket, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Layout from "@/modules/core/components/Layout";
import { governanceBoard } from "@/data/governance";
import { whatWeDoCards } from "@/data/about-cards";
import { GITHUB_GOVERNANCE_URL, GITHUB_DOTGITHUB_URL } from "@/data/external-links";

const cardIconMap: Record<string, LucideIcon> = { BookOpen, Users, Rocket };

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-28 md:pt-36 pb-8 md:pb-12">
        <div className="container max-w-7xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground animate-fade-in-up">
            About
          </h1>
          <p
            className="mt-5 text-foreground/70 font-body text-base leading-[1.7] max-w-3xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            A 501(c)(3) nonprofit building open infrastructure for reliable, verifiable data. We maintain the specification, support a global research community, and guide projects from idea to production.
          </p>
        </div>
      </section>

      <section className="py-8 md:py-14 bg-background">
        <div className="container max-w-7xl space-y-8 md:space-y-12">

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
                    <p className="text-base text-foreground/70 font-body leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Governance Board */}
          <div>
            <div className="h-px w-full bg-border/40 mb-6 md:mb-8" />
            <h2
              className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s" }}
            >
              Governance Board
            </h2>
            <p
              className="text-foreground/70 font-body text-base leading-relaxed mb-6 md:mb-8 max-w-4xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.25s" }}
            >
              A five-member board serving three-year terms. All governance rules are published on{" "}
              <a href="https://github.com/UOR-Foundation/.github" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">GitHub</a>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {governanceBoard.map((member, idx) => (
                <a
                  key={member.name}
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl border border-border bg-card overflow-hidden flex flex-row items-stretch min-h-[11rem] transition-all duration-300 hover:border-primary/20 hover:shadow-lg animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.3 + idx * 0.06}s` }}
                >
                  <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-lg md:text-xl font-semibold text-foreground leading-tight">
                          {member.name}
                        </h4>
                        <Linkedin size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <div className="h-px w-10 bg-border/60 my-2.5" />
                      <p className="text-sm font-medium text-primary font-body leading-snug">
                        {member.role}
                      </p>
                      {member.bio && (
                        <p className="text-sm text-muted-foreground font-body mt-1 leading-snug">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-28 md:w-32 shrink-0 relative overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="absolute inset-0 w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-500"
                      loading="lazy"
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>

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
