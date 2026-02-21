import { useState } from "react";
import { Bot, ArrowRight, ArrowDown } from "lucide-react";

const silos = ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"];

const capabilityDetails: Record<string, string> = {
  Reason: "AI systems can find and connect information across different sources without needing custom adapters for each one.",
  Verify: "Any system can independently confirm that data has not been altered and trace where it came from, without relying on a central authority.",
  Compose: "Smaller pieces of data can be combined into larger ones, and broken apart again, without losing any information along the way.",
  Navigate: "Any system can locate any piece of data by describing what it is, rather than knowing which server or database holds it.",
};

const capabilities = Object.keys(capabilityDetails);

const UORDiagram = () => {
  const [active, setActive] = useState<string>("Reason");
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Main diagram — dark for contrast */}
      <div className="bg-[hsl(var(--section-dark))] border border-[hsl(var(--section-dark-foreground)/0.1)] rounded-2xl p-8 md:p-12 overflow-hidden">
        {/* Header */}
        <p className="text-xs md:text-sm font-body font-semibold tracking-[0.18em] uppercase text-[hsl(var(--section-dark-foreground)/0.7)] mb-10 text-center">
          Fragmentation → Unification
        </p>

        {/* Three-stage flow */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0">
          {/* Stage 1: Fragmented silos */}
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="grid grid-cols-3 gap-2.5 max-w-[220px] w-full content-center">
              {silos.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-center rounded-lg border border-[hsl(var(--section-dark-foreground)/0.18)] bg-[hsl(var(--section-dark-foreground)/0.07)] h-[68px] text-xs font-body font-medium text-[hsl(var(--section-dark-foreground)/0.9)]"
                >
                  {s}
                </div>
              ))}
            </div>
            <p className="text-sm font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
              Isolated Data<br />Systems and Formats
            </p>
          </div>

          {/* Arrow + UOR label — white text, not blue */}
          <div className="flex flex-col items-center justify-center shrink-0 md:px-10 py-2 md:py-0">
            <ArrowRight className="hidden md:block w-8 h-8 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
            <ArrowDown className="block md:hidden w-7 h-7 text-[hsl(var(--section-dark-foreground)/0.9)]" strokeWidth={1.5} />
            <span className="text-xl md:text-2xl font-display font-extrabold tracking-[0.3em] uppercase text-[hsl(var(--section-dark-foreground))] mt-3">
              UOR
            </span>
            <span className="text-sm font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.6)] mt-1.5 tracking-[0.15em] uppercase text-center leading-snug">
              Universal<br />Lossless Encoder
            </span>
          </div>

          {/* Stage 3: Unified substrate */}
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="relative rounded-xl border border-[hsl(var(--section-dark-foreground)/0.2)] bg-[hsl(var(--section-dark-foreground)/0.05)] p-4 aspect-square max-w-[220px] w-full">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <defs>
                  <radialGradient id="nodeGlow">
                    <stop offset="0%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.5" />
                    <stop offset="30%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.15" />
                    <stop offset="60%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="hsl(var(--section-dark-foreground))" stopOpacity="0" />
                  </radialGradient>
                  <style>{`
                    @keyframes node-emanate {
                      0%, 100% { opacity: 0.12; transform: scale(0.3); }
                      13% { opacity: 0.4; transform: scale(1); }
                      26% { opacity: 0.14; transform: scale(0.4); }
                      39% { opacity: 0.32; transform: scale(0.88); }
                      52% { opacity: 0.12; transform: scale(0.3); }
                    }
                    .uor-emanate {
                      animation: node-emanate 1.94s ease-in-out infinite;
                      transform-box: fill-box;
                      transform-origin: center;
                    }
                    @keyframes line-breathe {
                      0%, 100% { opacity: 0.18; }
                      13% { opacity: 0.32; }
                      26% { opacity: 0.2; }
                      39% { opacity: 0.28; }
                      52% { opacity: 0.18; }
                    }
                    .uor-line-breathe { animation: line-breathe 1.94s ease-in-out infinite; }
                  `}</style>
                </defs>
                {/* Connections */}
                {[
                  [30, 25, 70, 50], [70, 50, 50, 75], [50, 75, 30, 25],
                  [30, 25, 20, 50], [70, 50, 80, 25], [50, 75, 80, 75],
                ].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--section-dark-foreground))" strokeWidth="1" className="uor-line-breathe" />
                ))}
                {/* Nodes */}
                {[
                  [30, 25], [70, 50], [50, 75], [20, 50], [80, 25], [80, 75],
                ].map(([cx, cy], i) => (
                  <g key={i}>
                    {/* Emanating glow — fixed at node center */}
                    <circle cx={cx} cy={cy} r={i < 3 ? 18 : 13} fill="url(#nodeGlow)" className="uor-emanate" />
                    {/* Core dot */}
                    <circle cx={cx} cy={cy} r={i < 3 ? 4.5 : 2.8} fill="hsl(var(--section-dark-foreground))" opacity="0.9" />
                    {/* Subtle ring */}
                    <circle cx={cx} cy={cy} r={i < 3 ? 8 : 5.5} fill="none" stroke="hsl(var(--section-dark-foreground))" strokeWidth="0.5" opacity="0.18" />
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-sm font-body font-semibold text-[hsl(var(--section-dark-foreground)/0.65)] text-center mt-5 tracking-[0.15em] uppercase leading-snug">
              Unified Computational<br />Substrate
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[hsl(var(--section-dark-foreground)/0.12)] my-9" />

        {/* Agentic AI section */}
        <div className="flex flex-col gap-5">
          <p className="text-xs font-body font-medium tracking-widest uppercase text-[hsl(var(--section-dark-foreground)/0.4)]">
            Example Use Case
          </p>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--section-dark-foreground)/0.1)] flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-5 h-5 text-[hsl(var(--section-dark-foreground)/0.8)]" />
            </div>
            <p className="text-sm md:text-base text-[hsl(var(--section-dark-foreground)/0.85)] font-body leading-relaxed flex-1">
              A single symbolic coordinate system becomes a <span className="text-[hsl(var(--section-dark-foreground))] font-medium">computational substrate</span>. AI agents reason, verify, and act across all data sources autonomously.
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
  );
};

export default UORDiagram;
