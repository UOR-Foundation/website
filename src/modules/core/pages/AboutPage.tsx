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
      <section className="hero-gradient pt-[21px] md:pt-52 pb-16 md:pb-28">
        <div className="container max-w-4xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            About the UOR Foundation
          </h1>
        </div>
      </section>

      <section className="py-12 md:py-28 bg-background">
        <div className="container max-w-4xl space-y-14">

          {/* Our Mission */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Mission</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              We develop an open standard that gives every piece of digital content a single, permanent address based on what it contains, making data findable, verifiable, and reusable across any system.
            </p>
          </div>

          <div className="rule" />

          {/* What We Do */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">What We Do</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {whatWeDoCards.map((item) => {
                const Icon = cardIconMap[item.iconKey];
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border/60 bg-card/50 p-5 flex flex-col gap-3"
                  >
                    {Icon && <Icon size={20} className="text-primary" />}
                    <h3 className="font-display text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rule" />

          {/* Our Governance */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Governance</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-10">
              The UOR Foundation is a registered 501(c)(3) nonprofit governed by a five-member board serving three-year terms. All governance rules are published on{" "}
              <a href="https://github.com/UOR-Foundation/.github" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">GitHub</a>.
            </p>
            <h3 className="font-display text-2xl font-semibold text-foreground mb-10">Board of Directors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-8 gap-y-12">
              {governanceBoard.map((member) => (
                <div key={member.name} className="flex flex-col">
                  <div className="aspect-[4/5] overflow-hidden rounded-xl mb-5">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-display text-lg font-semibold text-foreground leading-tight">
                      {member.name}
                    </p>
                    <a
                      href={member.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground/40 hover:text-primary transition-colors shrink-0"
                      aria-label={`${member.name} on LinkedIn`}
                    >
                      <Linkedin size={14} />
                    </a>
                  </div>
                  <p className="text-base font-medium text-primary font-body leading-snug">
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-base text-muted-foreground font-body mt-3 leading-[1.65]">
                      {member.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rule" />

          {/* Useful Links */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Useful Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Governance Charter", href: GITHUB_GOVERNANCE_URL },
                { label: "Code of Conduct", href: `${GITHUB_DOTGITHUB_URL}/blob/main/CODE_OF_CONDUCT.md` },
                { label: "Contributing Guide", href: `${GITHUB_DOTGITHUB_URL}/blob/main/CONTRIBUTING.md` },
                { label: "Organization on GitHub", href: GITHUB_DOTGITHUB_URL },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 rounded-xl border border-border/60 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <span className="text-base font-medium text-foreground font-body">{link.label}</span>
                  <ExternalLink size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
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
