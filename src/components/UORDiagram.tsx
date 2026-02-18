import { useState } from "react";
import { Bot, ArrowRight, ArrowDown } from "lucide-react";

const silos = ["APIs", "DBs", "Files", "AI Models", "Graphs", "Streams"];

const capabilityDetails: Record<string, string> = {
  Reason: "Agents traverse a unified semantic graph to draw inferences across formerly siloed data, with no custom connectors required.",
  Verify: "Content-addressed identity lets any agent independently confirm data integrity and provenance without trusting a central authority.",
  Compose: "Algebraic structure means objects combine into higher-order constructs while preserving referential integrity at every layer.",
  Navigate: "A single coordinate system lets agents locate and access any object by what it is, not where it lives, across every system.",
};

const capabilities = Object.keys(capabilityDetails);

const UORDiagram = () => {
  const [active, setActive] = useState<string>("Reason");
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Main diagram — dark for contrast */}
      <div className="bg-[hsl(var(--section-dark))] border border-[hsl(var(--section-dark-foreground)/0.1)] rounded-2xl p-7 md:p-10 overflow-hidden">
        {/* Header */}
        <p className="text-[11px] font-body font-semibold tracking-[0.2em] uppercase text-[hsl(var(--section-dark-foreground)/0.6)] mb-10 text-center">
          Fragmentation → Universal Encoding → Agentic Substrate
        </p>

        {/* Three-stage flow */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0">
          {/* Stage 1: Fragmented silos */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-3 gap-2">
              {silos.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-center rounded-lg border border-[hsl(var(--section-dark-foreground)/0.15)] bg-[hsl(var(--section-dark-foreground)/0.06)] py-3.5 text-xs font-body font-medium text-[hsl(var(--section-dark-foreground)/0.85)]"
                >
                  {s}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.5)] text-center mt-4 tracking-[0.15em] uppercase">
              Isolated Data Systems
            </p>
          </div>

          {/* Arrow + UOR label */}
          <div className="flex flex-col items-center justify-center shrink-0 md:px-10 py-2 md:py-0">
            <ArrowRight className="hidden md:block w-8 h-8 text-primary" strokeWidth={1.5} />
            <ArrowDown className="block md:hidden w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-xl md:text-2xl font-display font-extrabold tracking-[0.3em] uppercase text-primary mt-3">
              UOR
            </span>
            <span className="text-[11px] font-body font-medium text-primary/60 mt-1 tracking-wide text-center leading-snug">
              Universal Lossless Encoder
            </span>
          </div>

          {/* Stage 3: Unified substrate */}
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="relative rounded-xl border border-primary/30 bg-primary/[0.06] p-4 aspect-square max-w-[180px] w-full">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                {/* Connections */}
                {[
                  [30, 25, 70, 50], [70, 50, 50, 75], [50, 75, 30, 25],
                  [30, 25, 20, 50], [70, 50, 80, 25], [50, 75, 80, 75],
                ].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
                ))}
                {/* Nodes */}
                {[
                  [30, 25], [70, 50], [50, 75], [20, 50], [80, 25], [80, 75],
                ].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={i < 3 ? 5 : 3} fill="hsl(var(--primary))" opacity="0.85" />
                    <circle cx={cx} cy={cy} r={i < 3 ? 9 : 6} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.25" />
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[10px] font-body font-semibold text-primary/70 text-center mt-4 tracking-[0.15em] uppercase">
              Unified Computational Substrate
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[hsl(var(--section-dark-foreground)/0.12)] my-9" />

        {/* Agentic AI section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-[hsl(var(--section-dark-foreground)/0.8)] font-body leading-relaxed flex-1">
              A single symbolic coordinate system becomes a <span className="text-[hsl(var(--section-dark-foreground))] font-medium">computational substrate</span>. AI agents reason, verify, and act across all data sources autonomously.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-body font-semibold border transition-all duration-200 cursor-pointer ${
                  active === c
                    ? "border-primary/50 text-primary bg-primary/15 shadow-sm"
                    : "border-[hsl(var(--section-dark-foreground)/0.15)] text-[hsl(var(--section-dark-foreground)/0.7)] bg-transparent hover:border-primary/30 hover:text-primary/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-[hsl(var(--section-dark-foreground)/0.06)] border border-[hsl(var(--section-dark-foreground)/0.1)] px-5 py-4">
            <p className="text-sm font-body text-[hsl(var(--section-dark-foreground)/0.85)] leading-relaxed">
              {capabilityDetails[active]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UORDiagram;
