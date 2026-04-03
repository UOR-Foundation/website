import { ArrowRight, ArrowDown } from "lucide-react";

const silos = ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"];

const UorDiagramCompact = () => (
  <div className="mx-auto w-full max-w-[54rem] rounded-[1.75rem] border border-[hsl(var(--section-dark-foreground)/0.1)] bg-[hsl(var(--section-dark))] px-[clamp(1.5rem,2vw,2.75rem)] py-[clamp(1.75rem,2.4vw,3rem)] lg:min-h-[clamp(23rem,28vw,29rem)]">
    <p className="text-center font-body text-[clamp(0.8rem,0.28vw+0.76rem,1rem)] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--section-dark-foreground)/0.68)]">
      Fragmentation → Unification
    </p>

    <div className="mt-[clamp(1.75rem,2.4vw,2.75rem)] flex flex-col items-center gap-8 md:grid md:grid-cols-[minmax(0,1fr)_minmax(9.75rem,0.618fr)_minmax(0,1fr)] md:items-center md:gap-[clamp(1.25rem,2vw,2.5rem)]">
      <div className="flex w-full max-w-[19rem] flex-col items-center md:justify-self-start">
        <div className="grid w-full grid-cols-3 gap-[clamp(0.55rem,0.8vw,0.9rem)]">
          {silos.map((s) => (
            <div
              key={s}
              className="flex min-h-[clamp(4rem,4.3vw,4.75rem)] items-center justify-center rounded-xl border border-[hsl(var(--section-dark-foreground)/0.18)] bg-[hsl(var(--section-dark-foreground)/0.07)] px-2 text-center text-[clamp(0.95rem,0.35vw+0.82rem,1.08rem)] leading-[1.15] font-body font-medium text-[hsl(var(--section-dark-foreground)/0.9)]"
            >
              {s}
            </div>
          ))}
        </div>
        <p className="mt-5 text-center font-body text-[clamp(0.95rem,0.35vw+0.82rem,1.08rem)] font-semibold uppercase tracking-[0.15em] leading-[1.35] text-[hsl(var(--section-dark-foreground)/0.62)]">
          Isolated Data<br />Systems and Formats
        </p>
      </div>

      <div className="flex w-full max-w-[11.75rem] flex-col items-center justify-center md:justify-self-center">
        <ArrowRight className="hidden h-8 w-8 text-[hsl(var(--section-dark-foreground)/0.9)] md:block" strokeWidth={1.5} />
        <ArrowDown className="block h-7 w-7 text-[hsl(var(--section-dark-foreground)/0.9)] md:hidden" strokeWidth={1.5} />
        <span className="mt-3 font-display text-[clamp(1.95rem,0.95vw+1.35rem,2.7rem)] font-extrabold uppercase tracking-[0.28em] text-[hsl(var(--section-dark-foreground))]">
          UOR
        </span>
        <span className="mt-2 text-center font-body text-[clamp(0.95rem,0.35vw+0.82rem,1.08rem)] font-semibold uppercase tracking-[0.15em] leading-[1.35] text-[hsl(var(--section-dark-foreground)/0.62)]">
          Universal<br />Address System
        </span>
      </div>

      <div className="flex w-full max-w-[19rem] flex-col items-center md:justify-self-end">
        <div className="relative aspect-square w-full rounded-[1.35rem] border border-[hsl(var(--section-dark-foreground)/0.2)] bg-[hsl(var(--section-dark-foreground)/0.05)] p-[clamp(1rem,1.2vw,1.35rem)]">
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
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
            {[
              [30, 25, 70, 50],
              [70, 50, 50, 75],
              [50, 75, 30, 25],
              [30, 25, 20, 50],
              [70, 50, 80, 25],
              [50, 75, 80, 75],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--section-dark-foreground))" strokeWidth="1.1" className="home-line-breathe" />
            ))}
            {[
              [30, 25],
              [70, 50],
              [50, 75],
              [20, 50],
              [80, 25],
              [80, 75],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r={i < 3 ? 18 : 13} fill="url(#homeNodeGlow)" className="home-emanate" />
                <circle cx={cx} cy={cy} r={i < 3 ? 4.5 : 2.8} fill="hsl(var(--section-dark-foreground))" opacity="0.9" />
                <circle cx={cx} cy={cy} r={i < 3 ? 8 : 5.5} fill="none" stroke="hsl(var(--section-dark-foreground))" strokeWidth="0.6" opacity="0.18" />
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-5 text-center font-body text-[clamp(0.95rem,0.35vw+0.82rem,1.08rem)] font-semibold uppercase tracking-[0.15em] leading-[1.35] text-[hsl(var(--section-dark-foreground)/0.62)]">
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

        <div className="py-golden-lg mx-auto grid max-w-[1680px] grid-cols-1 items-center gap-[clamp(2.5rem,4vw,5.5rem)] animate-fade-in-up opacity-0 lg:grid-cols-[minmax(0,0.618fr)_minmax(0,1fr)]" style={{ animationDelay: "0.11s" }}>
          <div className="max-w-[42rem]">
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

          <div className="flex justify-center lg:justify-end">
            <UorDiagramCompact />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;
