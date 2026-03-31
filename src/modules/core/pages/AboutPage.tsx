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
      {/* Hero — large title + intro paragraph */}
      <section className="hero-gradient pt-28 md:pt-48 pb-20 md:pb-32">
        <div className="container max-w-6xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground animate-fade-in-up">
            About
          </h1>
          <p
            className="mt-6 md:mt-8 text-muted-foreground font-body text-base md:text-xl leading-[1.7] max-w-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            The UOR Foundation is a 501(c)(3) nonprofit that develops an open standard giving every piece of digital content a single, permanent address based on what it contains, making data findable, verifiable, and reusable across any system.
          </p>
        </div>
      </section>

      {/* What We Do — 3 column cards */}
      <section className="py-16 md:py-28 bg-background">
        <div className="container max-w-6xl">
          <div className="h-px w-full bg-border/40 mb-10 md:mb-14" />
          <h2
            className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 md:mb-10 animate-fade-in-up opacity-0"
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
                  className="rounded-xl border border-border/30 bg-card p-6 md:p-7 flex flex-col gap-3 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.25 + idx * 0.08}s` }}
                >
                  {Icon && <Icon size={20} className="text-primary" strokeWidth={1.5} />}
                  <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Board of Directors — horizontal cards in 2-column grid */}
      <section className="py-16 md:py-28 bg-background">
        <div className="container max-w-6xl">
          <div className="h-px w-full bg-border/40 mb-10 md:mb-14" />
          <h2
            className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            Board of Directors
          </h2>
          <p
            className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-10 md:mb-14 max-w-3xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            A five-member board serving three-year terms. All governance rules are published on{" "}
            <a href="https://github.com/UOR-Foundation/.github" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">GitHub</a>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {governanceBoard.map((member, idx) => (
              <div
                key={member.name}
                className="flex items-center gap-5 p-4 md:p-5 rounded-xl border border-border/30 bg-card animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.3 + idx * 0.08}s` }}
              >
                <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-display text-base md:text-lg font-semibold text-foreground leading-tight">
                      {member.name}
                    </h4>
                    <a
                      href={member.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground/30 hover:text-primary transition-colors shrink-0"
                      aria-label={`${member.name} on LinkedIn`}
                    >
                      <Linkedin size={13} />
                    </a>
                  </div>
                  <p className="text-sm font-medium text-primary/80 font-body">
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-sm text-muted-foreground/70 font-body leading-[1.6] mt-2">
                      {member.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Useful Links */}
      <section className="py-16 md:py-28 bg-background">
        <div className="container max-w-6xl">
          <div className="h-px w-full bg-border/40 mb-10 md:mb-14" />
          <h2
            className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 md:mb-10 animate-fade-in-up opacity-0"
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
      </section>
    </Layout>
  );
};

export default About;
