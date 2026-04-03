import { Linkedin, BookOpen, Users, Rocket, ExternalLink, Heart, Github } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { governanceBoard } from "@/data/governance";
import { whatWeDoCards, ourPrinciplesCards } from "@/data/about-cards";
import { GITHUB_DOTGITHUB_URL } from "@/data/external-links";
import DonatePopup from "@/modules/donate/components/DonatePopup";

const cardIconMap: Record<string, LucideIcon> = { BookOpen, Users, Rocket };

const principleColors = [
  "bg-primary",
  "bg-accent",
  "bg-muted-foreground",
];

const About = () => {
  const [donateOpen, setDonateOpen] = useState(false);

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            About
          </h1>
          <p
            className="mt-10 text-foreground/70 font-body text-fluid-body leading-[1.7] max-w-4xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            A 501(c)(3) nonprofit maintaining the UOR specification and the projects built on it.
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <a
              href="https://github.com/UOR-Foundation/.github"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <Github size={16} />
              Governance on GitHub
            </a>
            <button
              onClick={() => setDonateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200 cursor-pointer"
            >
              <Heart size={16} />
              Make a Donation
            </button>
          </div>
        </div>
      </section>

      <section className="py-section-sm bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] space-y-golden-lg">

          {/* What We Do */}
          <div>
            <div className="h-px w-full bg-border/40 mb-golden-md" />
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
              What We Do
            </p>
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
                    <h3 className="font-display text-fluid-card-title font-semibold text-foreground">{item.title}</h3>
                    <p className="text-fluid-body text-foreground/70 font-body leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Principles. compact inline row */}
            <div className="mt-6 pt-5 border-t border-border/30 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8">
              {ourPrinciplesCards.map((item, idx) => (
                <div
                  key={item.title}
                  className="flex items-start gap-2.5 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.35 + idx * 0.06}s` }}
                >
                  <div className={`w-2 h-2 rounded-full mt-[7px] shrink-0 ${principleColors[idx]}`} />
                  <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">
                    <span className="font-semibold text-foreground">{item.title}.</span>{" "}
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Governance Board */}
          <div>
            <div className="h-px w-full bg-border/40 mb-golden-md" />
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
              Governance Board
            </p>
            <p
              className="text-foreground/70 font-body text-fluid-body leading-relaxed mb-golden-md max-w-6xl animate-fade-in-up opacity-0"
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
                        <h4 className="font-display text-fluid-card-title font-semibold text-foreground leading-tight">
                          {member.name}
                        </h4>
                        <Linkedin size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <div className="h-px w-10 bg-border/60 my-2.5" />
                      <p className="text-fluid-label font-medium text-primary font-body leading-snug">
                        {member.role}
                      </p>
                      {member.bio && (
                        <p className="text-fluid-label text-foreground/65 font-body mt-1 leading-snug">
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
            <div className="h-px w-full bg-border/40 mb-golden-md" />
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
              Resources
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {[
                { label: "Foundation Bylaws", href: "https://github.com/UOR-Foundation/.github/blob/main/governance/The_UOR_Foundation_Bylaws.pdf" },
                { label: "Code of Conduct", href: "https://github.com/UOR-Foundation/.github/blob/main/CODE_OF_CONDUCT.md" },
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
                  <span className="text-fluid-body font-medium text-foreground font-body">{link.label}</span>
                  <ExternalLink size={15} className="text-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Support the Foundation */}
          <div>
            <div className="h-px w-full bg-border/40 mb-golden-md" />
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
              Support the Foundation
            </p>
            </h2>
            <p
              className="text-foreground/70 font-body text-fluid-body leading-relaxed mb-golden-md max-w-4xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.25s" }}
            >
              The UOR Foundation is a 501(c)(3) nonprofit. Your donations help us maintain open infrastructure, fund research, and support the developer community.
            </p>
            <button
              onClick={() => setDonateOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary font-medium font-body text-fluid-body hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.3s" }}
            >
              <Heart size={16} fill="currentColor" strokeWidth={0} className="opacity-70" />
              Make a Donation
            </button>
          </div>
        </div>
      </section>

      <DonatePopup open={donateOpen} onOpenChange={setDonateOpen} />
    </Layout>
  );
};

export default About;
