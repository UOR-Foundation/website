import { ArrowRight, ArrowDown } from "lucide-react";

const silos = ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"];

const UorDiagramCompact = () => (
  <div className="w-full max-w-[620px] bg-[hsl(var(--section-dark))] border border-[hsl(var(--section-dark-foreground)/0.1)] rounded-2xl p-8 md:p-10 overflow-hidden">
    {/* Header */}
    <p className="text-xs md:text-sm font-body font-semibold tracking-[0.18em] uppercase text-[hsl(var(--section-dark-foreground)/0.7)] mb-8 text-center">
      Fragmentation → Unification
    </p>

    {/* Three-stage flow */}
    <div className="flex flex-col md:flex-row items-center gap-5 md:gap-0">
      {/* Stage 1: Fragmented silos */}
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2.5 max-w-[210px] w-full">
          {silos.map((s) => (
            <div
              key={s}
              className="flex items-center justify-center rounded-lg border border-[hsl(var(--section-dark-foreground)/0.18)] bg-[hsl(var(--section-dark-foreground)/0.07)] h-[58px] text-[11px] md:text-sm font-body font-medium text-[hsl(var(--section-dark-foreground)/0.9)]"
            >
              {s}
            </div>
          ))}
        </div>
        <p className="text-xs font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] text-center mt-4 tracking-[0.15em] uppercase leading-snug">
          Isolated Data<br />Systems and Formats
        </p>
      </div>

      {/* Arrow + UOR label */}
      <div className="flex flex-col items-center justify-center shrink-0 md:px-6 py-1 md:py-0">
        <ArrowRight className="hidden md:block w-6 h-6 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
        <ArrowDown className="block md:hidden w-5 h-5 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
        <span className="text-xl md:text-2xl font-display font-extrabold tracking-[0.3em] uppercase text-[hsl(var(--section-dark-foreground))] mt-2">
          UOR
        </span>
        <span className="text-[10px] md:text-xs font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] mt-1 tracking-[0.15em] uppercase text-center leading-snug">
          Universal<br />Address System
        </span>
      </div>

      {/* Stage 3: Unified graph */}
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="relative rounded-xl border border-[hsl(var(--section-dark-foreground)/0.2)] bg-[hsl(var(--section-dark-foreground)/0.05)] p-3 aspect-square max-w-[180px] w-full">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <defs>
              <radialGradient id="homeNodeGlow">
                <stop offset="0%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.5" />
                <stop offset="30%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.15" />
                <stop offset="60%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.04" />
                <stop offset="100%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0" />
              </radialGradient>
              <style>{`
                @keyframes home-node-emanate {
                  0%, 100% { opacity: 0.12; transform: scale(0.3); }
                  13% { opacity: 0.4; transform: scale(1); }
                  26% { opacity: 0.14; transform: scale(0.4); }
                  39% { opacity: 0.32; transform: scale(0.88); }
                  52% { opacity: 0.12; transform: scale(0.3); }
                }
                .home-emanate {
                  animation: home-node-emanate 1.94s ease-in-out infinite;
                  transform-box: fill-box;
                  transform-origin: center;
                }
                @keyframes home-line-breathe {
                  0%, 100% { opacity: 0.18; }
                  13% { opacity: 0.32; }
                  26% { opacity: 0.2; }
                  39% { opacity: 0.28; }
                  52% { opacity: 0.18; }
                }
                .home-line-breathe { animation: home-line-breathe 1.94s ease-in-out infinite; }
              `}</style>
            </defs>
            {/* Connections */}
            {[
              [30, 25, 70, 50], [70, 50, 50, 75], [50, 75, 30, 25],
              [30, 25, 20, 50], [70, 50, 80, 25], [50, 75, 80, 75],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--section-dark-foreground))" strokeWidth="1" className="home-line-breathe" />
            ))}
            {/* Nodes */}
            {[
              [30, 25], [70, 50], [50, 75], [20, 50], [80, 25], [80, 75],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r={i < 3 ? 18 : 13} fill="url(#homeNodeGlow)" className="home-emanate" />
                <circle cx={cx} cy={cy} r={i < 3 ? 4.5 : 2.8} fill="hsl(var(--section-dark-foreground))" opacity="0.9" />
                <circle cx={cx} cy={cy} r={i < 3 ? 8 : 5.5} fill="none" stroke="hsl(var(--section-dark-foreground))" strokeWidth="0.5" opacity="0.18" />
              </g>
            ))}
          </svg>
        </div>
        <p className="text-xs font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.65)] text-center mt-4 tracking-[0.15em] uppercase leading-snug">
          One Shared<br />System
        </p>
      </div>
    </div>
  </div>
);

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

        <div className="py-golden-lg flex flex-col lg:flex-row lg:items-center lg:gap-16 animate-fade-in-up opacity-0" style={{ animationDelay: "0.11s" }}>
          {/* Text */}
          <div className="max-w-2xl lg:flex-1">
            <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              <span className="text-foreground/90 font-medium">Today, the same data gets different IDs in different systems. Move it, copy it, or federate it. The IDs break.</span>{" "}
              <span className="text-foreground/70 font-normal">UOR fixes this with one rule: the address comes from the content itself. Same data, same address, everywhere.</span>
            </p>
            <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              Move data anywhere, the address stays the same. No central authority required, no single point of failure.
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

          {/* Schematic */}
          <div className="mt-golden-lg lg:mt-0 lg:flex-1 flex justify-center">
            <UorDiagramCompact />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;
