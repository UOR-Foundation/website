import { ArrowRight, ArrowDown, Globe, ShieldCheck, Bot, Microscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const silos = ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"];

interface Application {
  icon: LucideIcon;
  title: string;
  description: string;
}

const applications: Application[] = [
  {
    icon: Globe,
    title: "Semantic Web",
    description: "Make data understandable by both people and machines, so systems can work together without custom translations.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-Based Computation",
    description: "Run a computation once and produce a receipt anyone can check. No need to re-run it or trust the source.",
  },
  {
    icon: Bot,
    title: "Agentic AI",
    description: "Give AI systems a single, reliable map of all available data so they can find, verify, and use information.",
  },
  {
    icon: Microscope,
    title: "Open Science",
    description: "Make research data findable, reproducible, and composable across institutions and disciplines.",
  },
];

const WhatIsUorSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />

        {/* Two-column: explanation + diagram */}
        <div className="py-golden-lg grid grid-cols-1 lg:grid-cols-[1fr,1.15fr] gap-12 lg:gap-20 items-start">
          {/* Left: Text */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.11s" }}>
            <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              <span className="text-foreground/90 font-medium">Universal Object Reference (UOR) gives every piece of data a permanent address derived from its content.</span>{" "}
              <span className="text-foreground/70 font-normal">The same input always produces the same address, on any machine, in any system.</span>
            </p>
            <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              Move data anywhere — the address stays the same. No central authority required, no single point of failure.
            </p>
            <div className="mt-golden-lg">
              <a
                href="/docs"
                className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
              >
                Read the Docs
                <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {/* Right: Compact UOR Diagram */}
          <div className="animate-fade-in-up opacity-0 w-full" style={{ animationDelay: "0.22s" }}>
            <div className="bg-[hsl(var(--section-dark))] border border-[hsl(var(--section-dark-foreground)/0.1)] rounded-2xl p-8 md:p-10 lg:p-12 overflow-hidden">
              <p className="text-sm md:text-base font-body font-semibold tracking-[0.18em] uppercase text-[hsl(var(--section-dark-foreground)/0.7)] mb-10 text-center">
                Fragmentation → Unification
              </p>
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0">
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="grid grid-cols-3 gap-2.5 md:gap-3 max-w-[260px] w-full content-center">
                    {silos.map((s) => (
                      <div key={s} className="flex items-center justify-center rounded-lg border border-[hsl(var(--section-dark-foreground)/0.18)] bg-[hsl(var(--section-dark-foreground)/0.07)] h-[60px] md:h-[68px] text-xs md:text-sm font-body font-medium text-[hsl(var(--section-dark-foreground)/0.9)]">
                        {s}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
                    Separate<br />Systems
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0 md:px-8 lg:px-10 py-2 md:py-0">
                  <ArrowRight className="hidden md:block w-8 h-8 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
                  <ArrowDown className="block md:hidden w-7 h-7 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
                  <span className="text-2xl md:text-3xl font-display font-extrabold tracking-[0.3em] uppercase text-[hsl(var(--section-dark-foreground))] mt-3">UOR</span>
                  <span className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] mt-1.5 tracking-[0.15em] uppercase text-center leading-snug">
                    Universal<br />Address System
                  </span>
                </div>
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="relative rounded-xl border border-[hsl(var(--section-dark-foreground)/0.2)] bg-[hsl(var(--section-dark-foreground)/0.05)] p-4 aspect-square max-w-[260px] w-full">
                    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                      <defs>
                        <radialGradient id="nodeGlowIntroMerged">
                          <stop offset="0%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.5" />
                          <stop offset="30%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      {[[30,25,70,50],[70,50,50,75],[50,75,30,25],[30,25,20,50],[70,50,80,25],[50,75,80,75]].map(([x1,y1,x2,y2],i) => (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--section-dark-foreground))" strokeWidth="1" opacity="0.22" />
                      ))}
                      {[[30,25],[70,50],[50,75],[20,50],[80,25],[80,75]].map(([cx,cy],i) => (
                        <g key={i}>
                          <circle cx={cx} cy={cy} r={i<3?18:13} fill="url(#nodeGlowIntroMerged)" />
                          <circle cx={cx} cy={cy} r={i<3?4.5:2.8} fill="hsl(var(--section-dark-foreground))" opacity="0.9" />
                        </g>
                      ))}
                    </svg>
                  </div>
                  <p className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.65)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
                    One Shared<br />System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rule-prime" />

        {/* Applications grid — inline below */}
        <div className="pt-golden-lg">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead mb-golden-md">
            Where It Applies
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {applications.map((app, idx) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.title}
                  className="group p-6 md:p-8 border-t border-foreground/8 flex flex-col gap-3 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.17 + idx * 0.07}s` }}
                >
                  <Icon size={22} className="text-primary/60 shrink-0 transition-colors duration-300 group-hover:text-primary" strokeWidth={1.5} />
                  <h3 className="font-display font-semibold text-foreground leading-tight text-fluid-card-title">{app.title}</h3>
                  <p className="text-foreground/65 font-body leading-[1.7] text-fluid-body">{app.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;
