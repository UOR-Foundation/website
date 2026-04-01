import { ArrowRight, ArrowDown, Bot } from "lucide-react";
import { useState } from "react";

const silos = ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"];

const capabilityDetails: Record<string, string> = {
  Reason: "AI systems can find and connect information across different sources without needing custom adapters for each one.",
  Verify: "Any system can independently confirm that data has not been altered and trace where it came from, without relying on a central authority.",
  Compose: "Smaller pieces of data can be combined into larger ones, and broken apart again, without losing any information along the way.",
  Navigate: "Any system can locate any piece of data by describing what it is, rather than knowing which server or database holds it.",
};

const capabilities = Object.keys(capabilityDetails);

const IntroSection = () => {
  const [active, setActive] = useState<string>("Reason");

  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <span className="font-mono text-fluid-body tracking-[0.12em] text-foreground/80">§2</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />

        <div className="py-golden-lg grid grid-cols-1 lg:grid-cols-[1fr,1.15fr] gap-12 lg:gap-20 items-start">
          {/* Left: Text */}
          <div
            className="animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.11s" }}
          >
            <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              <span className="text-foreground/90 font-medium">Universal Object Reference (UOR) gives every piece of data a permanent address derived from its content.</span>{" "}
              <span className="text-foreground/70 font-normal">The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.</span>
            </p>
            <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
            </p>
            <div className="mt-golden-lg">
              <a
                href="/framework"
                className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
              >
                Read the Framework
                <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {/* Right: Full UOR Diagram */}
          <div
            className="animate-fade-in-up opacity-0 w-full"
            style={{ animationDelay: "0.22s" }}
          >
            <div className="bg-[hsl(var(--section-dark))] border border-[hsl(var(--section-dark-foreground)/0.1)] rounded-2xl p-8 md:p-10 lg:p-12 overflow-hidden">
              {/* Header */}
              <p className="text-sm md:text-base font-body font-semibold tracking-[0.18em] uppercase text-[hsl(var(--section-dark-foreground)/0.7)] mb-10 text-center">
                Fragmentation → Unification
              </p>

              {/* Three-stage flow */}
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0">
                {/* Stage 1: Fragmented silos */}
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="grid grid-cols-3 gap-2.5 md:gap-3 max-w-[260px] w-full content-center">
                    {silos.map((s) => (
                      <div
                        key={s}
                        className="flex items-center justify-center rounded-lg border border-[hsl(var(--section-dark-foreground)/0.18)] bg-[hsl(var(--section-dark-foreground)/0.07)] h-[60px] md:h-[68px] text-xs md:text-sm font-body font-medium text-[hsl(var(--section-dark-foreground)/0.9)]"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
                    Isolated Data<br />Systems and Formats
                  </p>
                </div>

                {/* Arrow + UOR label */}
                <div className="flex flex-col items-center justify-center shrink-0 md:px-8 lg:px-10 py-2 md:py-0">
                  <ArrowRight className="hidden md:block w-8 h-8 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
                  <ArrowDown className="block md:hidden w-7 h-7 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
                  <span className="text-2xl md:text-3xl font-display font-extrabold tracking-[0.3em] uppercase text-[hsl(var(--section-dark-foreground))] mt-3">
                    UOR
                  </span>
                  <span className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] mt-1.5 tracking-[0.15em] uppercase text-center leading-snug">
                    Universal<br />Address System
                  </span>
                </div>

                {/* Stage 3: Unified substrate */}
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="relative rounded-xl border border-[hsl(var(--section-dark-foreground)/0.2)] bg-[hsl(var(--section-dark-foreground)/0.05)] p-4 aspect-square max-w-[260px] w-full">
                    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                      <defs>
                        <radialGradient id="nodeGlowIntro">
                          <stop offset="0%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.5" />
                          <stop offset="30%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.15" />
                          <stop offset="60%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.04" />
                          <stop offset="100%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0" />
                        </radialGradient>
                        <style>{`
                          @keyframes intro-node-emanate {
                            0%, 100% { opacity: 0.12; transform: scale(0.3); }
                            13% { opacity: 0.4; transform: scale(1); }
                            26% { opacity: 0.14; transform: scale(0.4); }
                            39% { opacity: 0.32; transform: scale(0.88); }
                            52% { opacity: 0.12; transform: scale(0.3); }
                          }
                          .intro-emanate {
                            animation: intro-node-emanate 1.94s ease-in-out infinite;
                            transform-box: fill-box;
                            transform-origin: center;
                          }
                          @keyframes intro-line-breathe {
                            0%, 100% { opacity: 0.18; }
                            13% { opacity: 0.32; }
                            26% { opacity: 0.2; }
                            39% { opacity: 0.28; }
                            52% { opacity: 0.18; }
                          }
                          .intro-line-breathe { animation: intro-line-breathe 1.94s ease-in-out infinite; }
                        `}</style>
                      </defs>
                      {/* Connections */}
                      {[
                        [30, 25, 70, 50], [70, 50, 50, 75], [50, 75, 30, 25],
                        [30, 25, 20, 50], [70, 50, 80, 25], [50, 75, 80, 75],
                      ].map(([x1, y1, x2, y2], i) => (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--section-dark-foreground))" strokeWidth="1" className="intro-line-breathe" />
                      ))}
                      {/* Nodes */}
                      {[
                        [30, 25], [70, 50], [50, 75], [20, 50], [80, 25], [80, 75],
                      ].map(([cx, cy], i) => (
                        <g key={i}>
                          <circle cx={cx} cy={cy} r={i < 3 ? 18 : 13} fill="url(#nodeGlowIntro)" className="intro-emanate" />
                          <circle cx={cx} cy={cy} r={i < 3 ? 4.5 : 2.8} fill="hsl(var(--section-dark-foreground))" opacity="0.9" />
                          <circle cx={cx} cy={cy} r={i < 3 ? 8 : 5.5} fill="none" stroke="hsl(var(--section-dark-foreground))" strokeWidth="0.5" opacity="0.18" />
                        </g>
                      ))}
                    </svg>
                  </div>
                  <p className="text-sm md:text-base font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.65)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
                    One Shared<br />System
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-[hsl(var(--section-dark-foreground)/0.12)] my-9" />

              {/* Agentic AI section */}
              <div className="flex flex-col gap-5">
                <p className="text-xs md:text-sm font-body font-medium tracking-widest uppercase text-[hsl(var(--section-dark-foreground)/0.4)]">
                  Example Use Case
                </p>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--section-dark-foreground)/0.1)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-5 h-5 text-[hsl(var(--section-dark-foreground)/0.8)]" />
                  </div>
                  <p className="text-sm md:text-base text-[hsl(var(--section-dark-foreground)/0.85)] font-body leading-relaxed flex-1">
                    When all data shares one address system, AI can find, verify, and use information across every source <span className="text-[hsl(var(--section-dark-foreground))] font-medium">without custom connectors or translations</span>.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActive(c)}
                      className={`px-4 py-2 rounded-full text-sm font-body font-semibold border transition-all duration-200 cursor-pointer ${
                        active === c
                          ? "border-[hsl(var(--section-dark-foreground)/0.4)] text-[hsl(var(--section-dark-foreground))] bg-[hsl(var(--section-dark-foreground)/0.12)] shadow-sm"
                          : "border-[hsl(var(--section-dark-foreground)/0.15)] text-[hsl(var(--section-dark-foreground)/0.6)] bg-transparent hover:border-[hsl(var(--section-dark-foreground)/0.3)] hover:text-[hsl(var(--section-dark-foreground)/0.85)]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-[hsl(var(--section-dark-foreground)/0.06)] border border-[hsl(var(--section-dark-foreground)/0.1)] px-5 py-4">
                  <p className="text-sm md:text-base font-body text-[hsl(var(--section-dark-foreground)/0.85)] leading-relaxed">
                    {capabilityDetails[active]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rule-prime" />
      </div>
    </section>
  );
};

export default IntroSection;
