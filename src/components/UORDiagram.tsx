import { Bot, ArrowRight, ArrowDown } from "lucide-react";

const silos = ["APIs", "DBs", "Files", "Models", "Graphs", "Streams"];
const capabilities = ["Reason", "Verify", "Compose", "Navigate"];

const UORDiagram = () => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-10">
        <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-muted-foreground mb-8 text-center">
          Fragmentation → Universal Encoding → Agentic Substrate
        </p>

        {/* Main flow: Silos → UOR → Unified Space */}
        <div className="flex flex-col md:flex-row items-center gap-5 md:gap-6">
          {/* Fragmented silos */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-3 gap-2">
              {silos.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/40 py-2.5 text-[11px] font-body font-medium text-muted-foreground"
                >
                  {s}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-body text-muted-foreground/60 text-center mt-2.5 tracking-wide uppercase">
              Isolated Systems
            </p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center shrink-0 self-center md:mx-2">
            <ArrowRight className="hidden md:block w-8 h-8 text-primary/60" strokeWidth={1.5} />
            <ArrowDown className="block md:hidden w-6 h-6 text-primary/60" strokeWidth={1.5} />
            <span className="text-[9px] font-body font-bold tracking-[0.2em] uppercase text-primary mt-1">
              UOR
            </span>
          </div>

          {/* Unified coordinate space */}
          <div className="flex-1 w-full">
            <div className="relative rounded-xl border border-primary/20 bg-primary/[0.03] p-5 aspect-square max-w-[180px] mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                {/* Grid lines */}
                {[20, 40, 60, 80].map((v) => (
                  <g key={v} opacity="0.06">
                    <line x1={v} y1="10" x2={v} y2="90" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                    <line x1="10" y1={v} x2="90" y2={v} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                  </g>
                ))}
                {/* Connections */}
                {[
                  [30, 25, 70, 50], [70, 50, 50, 75], [50, 75, 30, 25],
                  [30, 25, 20, 50], [70, 50, 80, 25], [50, 75, 80, 75],
                ].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.2" />
                ))}
                {/* Nodes */}
                {[
                  [30, 25], [70, 50], [50, 75], [20, 50], [80, 25], [80, 75],
                ].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={i < 3 ? 4 : 2.5} fill="hsl(var(--primary))" opacity="0.7" />
                    <circle cx={cx} cy={cy} r={i < 3 ? 7 : 5} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.2" />
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[10px] font-body text-primary/60 text-center mt-2.5 tracking-wide uppercase">
              Unified Computational Substrate
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border my-6" />

        {/* Agentic AI row */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">
            A single coordinate system becomes a <span className="text-foreground font-medium">computational substrate</span> — AI agents reason, verify, and act across all data sources autonomously.
          </p>
          <div className="hidden sm:flex flex-wrap gap-1.5 shrink-0">
            {capabilities.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-full text-[10px] font-body font-medium border border-primary/15 text-primary bg-primary/[0.05]">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UORDiagram;
