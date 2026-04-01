import { ArrowRight } from "lucide-react";

const sourceLabels = [
  "APIs", "Databases", "Files",
  "AI Models", "Graphs", "Streams",
  "Ledgers", "Devices", "Protocols",
];

const UorSchematic = () => (
  <div
    className="animate-fade-in-up opacity-0 w-full"
    style={{ animationDelay: "0.25s" }}
  >
    {/* Header */}
    <p className="text-center font-mono text-[0.7rem] tracking-[0.25em] uppercase text-foreground/40 mb-6">
      Fragmentation → Unification
    </p>

    <div className="flex items-center gap-4 md:gap-6">
      {/* Left: Isolated systems grid */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
          {sourceLabels.map((label) => (
            <div
              key={label}
              className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-2 py-2 text-center font-mono text-[0.65rem] md:text-xs text-foreground/50 truncate"
            >
              {label}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-[0.6rem] tracking-[0.15em] uppercase text-foreground/30">
          Isolated Data Systems
        </p>
      </div>

      {/* Arrow + UOR label */}
      <div className="flex flex-col items-center gap-1 shrink-0 px-1">
        <ArrowRight size={18} className="text-foreground/30" />
        <span className="font-display text-lg md:text-xl font-bold tracking-wider text-foreground/80">
          UOR
        </span>
        <span className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-foreground/30 text-center leading-tight">
          Universal<br />Address
        </span>
      </div>

      {/* Right: One shared system */}
      <div className="flex-1 min-w-0 flex flex-col items-center">
        <div className="relative w-full aspect-square max-w-[140px] md:max-w-[160px] rounded-lg border border-foreground/10 bg-foreground/[0.03] flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-[70%] h-[70%]">
            {/* Edges */}
            <line x1="50" y1="15" x2="20" y2="45" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <line x1="50" y1="15" x2="80" y2="45" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <line x1="20" y1="45" x2="80" y2="45" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <line x1="20" y1="45" x2="35" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <line x1="80" y1="45" x2="65" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            <line x1="35" y1="80" x2="65" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
            {/* Nodes */}
            <circle cx="50" cy="15" r="5" className="fill-primary/80" />
            <circle cx="20" cy="45" r="5" className="fill-primary/60" />
            <circle cx="80" cy="45" r="5" className="fill-primary/80" />
            <circle cx="35" cy="80" r="4" className="fill-primary/50" />
            <circle cx="65" cy="80" r="4" className="fill-primary/50" />
            {/* Small accent dot */}
            <circle cx="58" cy="30" r="2.5" className="fill-accent/70" />
          </svg>
        </div>
        <p className="mt-3 text-center font-mono text-[0.6rem] tracking-[0.15em] uppercase text-foreground/30">
          One Shared System
        </p>
      </div>
    </div>
  </div>
);

const IntroSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <span className="font-mono text-fluid-body tracking-[0.12em] text-foreground/25">§2</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />
        <div className="py-golden-lg grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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

          {/* Right: Schematic */}
          <UorSchematic />
        </div>
        <div className="rule-prime" />
      </div>
    </section>
  );
};

export default IntroSection;
