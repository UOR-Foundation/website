/**
 * Rulial Motion Simulator — navigate quantum levels via morphism animations.
 *
 * Visualizes ProjectionHomomorphism (Q_high → Q_low) and
 * InclusionHomomorphism (Q_low → Q_high) as animated traversals
 * through rulial space, where each quantum level is a ring Z/(2^n)Z.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUp, Zap, Play, RotateCcw } from "lucide-react";

// ── Quantum Level Definitions (Q0–Q7) ─────────────────────────────────────

interface QLevel {
  label: string;
  bits: number;
  modulus: bigint;
  ring: string;
  color: string;       // hsl token class suffix
  radius: number;      // visual orbit radius %
  description: string;
}

const Q_LEVELS: QLevel[] = [
  { label: "Q0", bits: 8,   modulus: 256n,           ring: "Z/256Z",           color: "from-emerald-400 to-emerald-600",   radius: 18, description: "Byte ring — exhaustively verifiable" },
  { label: "Q1", bits: 16,  modulus: 65536n,         ring: "Z/65536Z",         color: "from-cyan-400 to-cyan-600",         radius: 26, description: "Word ring — Unicode-complete" },
  { label: "Q2", bits: 32,  modulus: 4294967296n,     ring: "Z/4294967296Z",    color: "from-blue-400 to-blue-600",         radius: 34, description: "DWord ring — IPv4 address space" },
  { label: "Q3", bits: 64,  modulus: 1n << 64n,       ring: "Z/2⁶⁴Z",          color: "from-violet-400 to-violet-600",     radius: 42, description: "QWord ring — machine word" },
  { label: "Q4", bits: 128, modulus: 1n << 128n,      ring: "Z/2¹²⁸Z",         color: "from-purple-400 to-purple-600",     radius: 50, description: "UUID / IPv6 address space" },
  { label: "Q5", bits: 256, modulus: 1n << 256n,      ring: "Z/2²⁵⁶Z",         color: "from-fuchsia-400 to-fuchsia-600",   radius: 58, description: "SHA-256 hash space" },
  { label: "Q6", bits: 512, modulus: 1n << 512n,      ring: "Z/2⁵¹²Z",         color: "from-pink-400 to-pink-600",         radius: 66, description: "Post-quantum key space" },
  { label: "Q7", bits: 1024, modulus: 1n << 1024n,    ring: "Z/2¹⁰²⁴Z",        color: "from-rose-400 to-rose-600",         radius: 74, description: "Cryptographic ceremony space" },
];

// ── Morphism computation ──────────────────────────────────────────────────

type MorphismDirection = "project" | "embed";

interface MorphismStep {
  direction: MorphismDirection;
  from: number;
  to: number;
  input: bigint;
  output: bigint;
  lossless: boolean;
  timestamp: number;
}

function computeMorphism(
  value: bigint,
  fromIdx: number,
  toIdx: number
): { output: bigint; lossless: boolean; direction: MorphismDirection } {
  const from = Q_LEVELS[fromIdx];
  const to = Q_LEVELS[toIdx];
  const normalized = value % from.modulus;

  if (fromIdx > toIdx) {
    // Projection: lossy — take low bits
    const output = normalized % to.modulus;
    return { output, lossless: normalized < to.modulus, direction: "project" };
  } else {
    // Inclusion: lossless embedding
    return { output: normalized, lossless: true, direction: "embed" };
  }
}

// ── Animation helpers ─────────────────────────────────────────────────────

function useMorphismAnimation() {
  const [animating, setAnimating] = useState(false);
  const [particleTrail, setParticleTrail] = useState<{ fromIdx: number; toIdx: number; progress: number; direction: MorphismDirection } | null>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback((fromIdx: number, toIdx: number, direction: MorphismDirection, onComplete: () => void) => {
    setAnimating(true);
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setParticleTrail({ fromIdx, toIdx, progress: eased, direction });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimating(false);
        setParticleTrail(null);
        onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { animating, particleTrail, animate };
}

// ── Main Page Component ───────────────────────────────────────────────────

export default function RulialMotionPage() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [inputValue, setInputValue] = useState("42");
  const [history, setHistory] = useState<MorphismStep[]>([]);
  const [currentValue, setCurrentValue] = useState(42n);
  const { animating, particleTrail, animate } = useMorphismAnimation();

  const handleMove = useCallback((targetIdx: number) => {
    if (targetIdx === currentLevel || animating) return;

    const { output, lossless, direction } = computeMorphism(currentValue, currentLevel, targetIdx);

    animate(currentLevel, targetIdx, direction, () => {
      const step: MorphismStep = {
        direction,
        from: currentLevel,
        to: targetIdx,
        input: currentValue,
        output,
        lossless,
        timestamp: Date.now(),
      };
      setHistory(prev => [step, ...prev].slice(0, 20));
      setCurrentValue(output);
      setCurrentLevel(targetIdx);
    });
  }, [currentLevel, currentValue, animating, animate]);

  const handleReset = () => {
    const val = BigInt(parseInt(inputValue) || 42);
    setCurrentValue(val);
    setCurrentLevel(0);
    setHistory([]);
  };

  const handleSetValue = () => {
    try {
      const val = BigInt(inputValue);
      setCurrentValue(val >= 0n ? val : 0n);
    } catch {
      // ignore invalid input
    }
  };

  // Compute positions for the orbital visualization
  const centerX = 50;
  const centerY = 50;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/ruliad" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold font-['Playfair_Display']">Rulial Motion Simulator</h1>
              <p className="text-sm text-muted-foreground">Navigate quantum levels via morphism trajectories</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
              morphism:Transform
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* ── Left: Orbital Visualization ──────────────────────────────── */}
        <div className="space-y-6">
          {/* Orbital map */}
          <div className="relative bg-card border border-border rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Background grid */}
              <defs>
                <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.08)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="url(#bg-glow)" />

              {/* Orbital rings */}
              {Q_LEVELS.map((q, i) => (
                <circle
                  key={q.label}
                  cx={centerX}
                  cy={centerY}
                  r={q.radius * 0.55}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={currentLevel === i ? 0.4 : 0.15}
                  strokeDasharray={currentLevel === i ? "none" : "1 1"}
                  opacity={currentLevel === i ? 1 : 0.4}
                />
              ))}

              {/* Animated particle trail */}
              {particleTrail && (() => {
                const fromR = Q_LEVELS[particleTrail.fromIdx].radius * 0.55;
                const toR = Q_LEVELS[particleTrail.toIdx].radius * 0.55;
                const currentR = fromR + (toR - fromR) * particleTrail.progress;
                // Spiral angle during transition
                const angle = particleTrail.progress * Math.PI * 1.5 - Math.PI / 2;
                const px = centerX + currentR * Math.cos(angle);
                const py = centerY + currentR * Math.sin(angle);

                return (
                  <g>
                    {/* Trail line */}
                    <line
                      x1={centerX}
                      y1={centerY - fromR}
                      x2={px}
                      y2={py}
                      stroke={particleTrail.direction === "project"
                        ? "hsl(0, 70%, 60%)"
                        : "hsl(150, 70%, 50%)"}
                      strokeWidth={0.3}
                      opacity={0.6}
                      strokeDasharray="0.5 0.5"
                    />
                    {/* Particle */}
                    <circle
                      cx={px}
                      cy={py}
                      r={1.2}
                      fill={particleTrail.direction === "project"
                        ? "hsl(0, 70%, 60%)"
                        : "hsl(150, 70%, 50%)"}
                    >
                      <animate
                        attributeName="opacity"
                        values="1;0.5;1"
                        dur="0.3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Glow */}
                    <circle
                      cx={px}
                      cy={py}
                      r={2.5}
                      fill={particleTrail.direction === "project"
                        ? "hsl(0, 70%, 60%)"
                        : "hsl(150, 70%, 50%)"}
                      opacity={0.15}
                    />
                  </g>
                );
              })()}

              {/* Level nodes */}
              {Q_LEVELS.map((q, i) => {
                const angle = -Math.PI / 2 + (i / Q_LEVELS.length) * Math.PI * 2;
                const r = q.radius * 0.55;
                const nx = centerX + r * Math.cos(angle);
                const ny = centerY + r * Math.sin(angle);
                const isActive = currentLevel === i;
                const isReachable = !animating && i !== currentLevel;

                return (
                  <g
                    key={q.label}
                    className={isReachable ? "cursor-pointer" : ""}
                    onClick={() => isReachable && handleMove(i)}
                  >
                    {/* Node glow */}
                    {isActive && (
                      <circle cx={nx} cy={ny} r={3} fill="hsl(var(--primary))" opacity={0.2}>
                        <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Node circle */}
                    <circle
                      cx={nx}
                      cy={ny}
                      r={isActive ? 2.2 : 1.6}
                      fill={isActive ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      stroke={isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--border))"}
                      strokeWidth={0.3}
                      className={isReachable ? "hover:opacity-80 transition-opacity" : ""}
                    />
                    {/* Label */}
                    <text
                      x={nx}
                      y={ny + (i < 4 ? -3.5 : 4.5)}
                      textAnchor="middle"
                      fill={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                      fontSize={isActive ? 2.4 : 2}
                      fontWeight={isActive ? 700 : 400}
                      fontFamily="monospace"
                    >
                      {q.label}
                    </text>
                    {/* Bit width */}
                    <text
                      x={nx}
                      y={ny + (i < 4 ? -1.5 : 6.2)}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize={1.4}
                      opacity={isActive ? 0.8 : 0.5}
                      fontFamily="monospace"
                    >
                      {q.bits}b
                    </text>
                  </g>
                );
              })}

              {/* Center label */}
              <text x={centerX} y={centerY - 1} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={2.2} fontWeight={700} fontFamily="'Playfair Display', serif">
                Rulial
              </text>
              <text x={centerX} y={centerY + 1.5} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={1.6}>
                Space
              </text>
            </svg>

            {/* Morphism legend */}
            <div className="absolute bottom-3 left-3 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: "hsl(150, 70%, 50%)" }} />
                <span className="text-muted-foreground">Inclusion (lossless)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: "hsl(0, 70%, 60%)" }} />
                <span className="text-muted-foreground">Projection (lossy)</span>
              </span>
            </div>
          </div>

          {/* Current state panel */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Current Position</h2>
              <span className={`text-xs font-mono px-2 py-0.5 rounded bg-gradient-to-r ${Q_LEVELS[currentLevel].color} text-white`}>
                {Q_LEVELS[currentLevel].label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Ring</span>
                <p className="font-mono font-medium">{Q_LEVELS[currentLevel].ring}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Bit Width</span>
                <p className="font-mono font-medium">{Q_LEVELS[currentLevel].bits} bits</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Current Value</span>
                <p className="font-mono font-medium text-primary break-all">
                  {currentValue.toString()}
                  {currentValue <= 0xFFFFn && (
                    <span className="text-muted-foreground ml-2">(0x{currentValue.toString(16).toUpperCase()})</span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Description</span>
                <p className="text-sm">{Q_LEVELS[currentLevel].description}</p>
              </div>
            </div>

            {/* Quick navigation buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => currentLevel > 0 && handleMove(currentLevel - 1)}
                disabled={currentLevel === 0 || animating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5 text-destructive" />
                Project ↓
              </button>
              <button
                onClick={() => currentLevel < Q_LEVELS.length - 1 && handleMove(currentLevel + 1)}
                disabled={currentLevel === Q_LEVELS.length - 1 || animating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" style={{ color: "hsl(150, 70%, 50%)" }} />
                Embed ↑
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Controls & History ─────────────────────────────── */}
        <div className="space-y-6">
          {/* Input controls */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Controls
            </h2>

            <div>
              <label className="text-xs text-muted-foreground">Input Value</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="42"
                />
                <button
                  onClick={handleSetValue}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Direct jump */}
            <div>
              <label className="text-xs text-muted-foreground">Jump to Level</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {Q_LEVELS.map((q, i) => (
                  <button
                    key={q.label}
                    onClick={() => handleMove(i)}
                    disabled={i === currentLevel || animating}
                    className={`px-2 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                      i === currentLevel
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-30"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Q0
            </button>
          </div>

          {/* Morphism History */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">Morphism Trace</h2>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Click a quantum level to begin traversing rulial space.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((step, i) => (
                  <div
                    key={step.timestamp + "-" + i}
                    className="border border-border rounded-lg p-3 text-xs space-y-1 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">
                        {step.direction === "project" ? "π" : "ι"}: {Q_LEVELS[step.from].label} → {Q_LEVELS[step.to].label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        step.lossless
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {step.lossless ? "lossless" : "lossy"}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-mono">
                      {step.input.toString()} → {step.output.toString()}
                    </div>
                    <div className="text-muted-foreground">
                      {step.direction === "project"
                        ? `ProjectionHomomorphism: x mod ${Q_LEVELS[step.to].modulus.toString()}`
                        : `InclusionHomomorphism: identity embedding`
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical Identity check */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Critical Identity</h2>
            <p className="font-mono text-sm">
              neg(bnot(x)) ≡ succ(x)
            </p>
            <div className="text-xs text-muted-foreground">
              Holds independently at every quantum level — the mathematical anchor ensuring each ring in rulial space is sound.
            </div>
            <CriticalIdentityCheck value={currentValue} level={currentLevel} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Critical Identity inline verification ─────────────────────────────────

function CriticalIdentityCheck({ value, level }: { value: bigint; level: number }) {
  const q = Q_LEVELS[level];
  const mod = q.modulus;
  const mask = mod - 1n;
  const x = value % mod;

  const negBnot = (mod - (x ^ mask) % mod) % mod;
  const succX = (x + 1n) % mod;
  const holds = negBnot === succX;

  return (
    <div className={`mt-2 p-2 rounded-lg text-xs font-mono ${
      holds
        ? "bg-emerald-500/10 border border-emerald-500/20"
        : "bg-destructive/10 border border-destructive/20"
    }`}>
      <div>neg(bnot({x.toString()})) = {negBnot.toString()}</div>
      <div>succ({x.toString()}) = {succX.toString()}</div>
      <div className="font-medium mt-1">
        {holds ? "✓ Identity holds" : "✗ Identity violated"} at {q.label}
      </div>
    </div>
  );
}
