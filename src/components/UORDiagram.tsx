const UORDiagram = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="relative bg-card border border-border rounded-2xl p-8 md:p-12 overflow-hidden">
        {/* Title */}
        <p className="text-xs font-body font-medium tracking-widest uppercase text-muted-foreground mb-10 text-center">
          From Fragmentation to Unity
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4">
          {/* Left: Fragmented Systems */}
          <div className="flex-1 w-full">
            <div className="relative p-6 rounded-xl border border-border bg-background/60">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-muted-foreground/70 mb-5 text-center">
                Fragmented Systems
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "API", color: "hsl(var(--primary) / 0.15)" },
                  { label: "DB", color: "hsl(var(--accent) / 0.15)" },
                  { label: "File", color: "hsl(var(--primary) / 0.10)" },
                  { label: "Model", color: "hsl(var(--accent) / 0.12)" },
                  { label: "Graph", color: "hsl(var(--primary) / 0.12)" },
                  { label: "Stream", color: "hsl(var(--accent) / 0.10)" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-center rounded-lg border border-border/60 py-3 px-2 text-xs font-body font-medium text-muted-foreground"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Disconnected lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" preserveAspectRatio="none">
                <line x1="20%" y1="35%" x2="50%" y2="55%" stroke="hsl(var(--foreground))" strokeWidth="1" strokeDasharray="3 4" />
                <line x1="80%" y1="40%" x2="45%" y2="70%" stroke="hsl(var(--foreground))" strokeWidth="1" strokeDasharray="3 4" />
                <line x1="30%" y1="75%" x2="70%" y2="45%" stroke="hsl(var(--foreground))" strokeWidth="1" strokeDasharray="3 4" />
              </svg>
            </div>
          </div>

          {/* Center: UOR Transform Arrow */}
          <div className="flex flex-col items-center gap-2 shrink-0 py-4 md:py-0">
            <svg width="64" height="40" viewBox="0 0 64 40" fill="none" className="hidden md:block">
              <path
                d="M4 20H52M52 20L40 8M52 20L40 32"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="block md:hidden">
              <path
                d="M20 4V40M20 40L8 28M20 40L32 28"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] font-body font-semibold tracking-widest uppercase text-primary">
              UOR
            </span>
          </div>

          {/* Right: Unified Coordinate Space */}
          <div className="flex-1 w-full">
            <div className="relative p-6 rounded-xl border border-primary/20 bg-primary/[0.03]">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/70 mb-5 text-center">
                Unified Coordinate Space
              </p>
              {/* Geometric grid */}
              <div className="relative aspect-[4/3] w-full">
                <svg viewBox="0 0 200 150" className="w-full h-full" fill="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <g key={`grid-${i}`} opacity="0.08">
                      <line
                        x1={40 + i * 30}
                        y1="15"
                        x2={40 + i * 30}
                        y2="135"
                        stroke="hsl(var(--foreground))"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="25"
                        y1={15 + i * 30}
                        x2="175"
                        y2={15 + i * 30}
                        stroke="hsl(var(--foreground))"
                        strokeWidth="0.5"
                      />
                    </g>
                  ))}

                  {/* Connection lines */}
                  <line x1="70" y1="45" x2="130" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.25" />
                  <line x1="130" y1="75" x2="100" y2="105" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.25" />
                  <line x1="100" y1="105" x2="70" y2="45" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.25" />
                  <line x1="70" y1="45" x2="40" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
                  <line x1="130" y1="75" x2="160" y2="45" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
                  <line x1="100" y1="105" x2="160" y2="105" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />

                  {/* Nodes with labels */}
                  {[
                    { cx: 70, cy: 45, r: 5, label: "API", lx: 58, ly: 36 },
                    { cx: 130, cy: 75, r: 5, label: "DB", lx: 138, ly: 72 },
                    { cx: 100, cy: 105, r: 5, label: "File", lx: 85, ly: 120 },
                    { cx: 40, cy: 75, r: 3.5, label: "Model", lx: 18, ly: 72 },
                    { cx: 160, cy: 45, r: 3.5, label: "Graph", lx: 148, ly: 36 },
                    { cx: 160, cy: 105, r: 3.5, label: "Stream", lx: 145, ly: 120 },
                  ].map((n) => (
                    <g key={n.label}>
                      <circle cx={n.cx} cy={n.cy} r={n.r} fill="hsl(var(--primary))" opacity="0.7" />
                      <circle cx={n.cx} cy={n.cy} r={n.r + 4} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.2" />
                      <text
                        x={n.lx}
                        y={n.ly}
                        fill="hsl(var(--muted-foreground))"
                        fontSize="8"
                        fontFamily="DM Sans, sans-serif"
                        fontWeight="500"
                      >
                        {n.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom caption */}
        <p className="mt-8 text-center text-sm text-muted-foreground font-body leading-relaxed max-w-lg mx-auto">
          Every object gets a <span className="text-foreground font-medium">permanent, content-based address</span> — enabling verification, composition, and reasoning across any system.
        </p>
      </div>
    </div>
  );
};

export default UORDiagram;
