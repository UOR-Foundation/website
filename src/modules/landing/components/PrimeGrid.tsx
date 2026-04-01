import { useMemo } from "react";

/** Sieve of Eratosthenes — returns a Set of primes up to `max`. */
function sievePrimes(max: number): Set<number> {
  const flags = new Uint8Array(max + 1).fill(1);
  flags[0] = flags[1] = 0;
  for (let i = 2; i * i <= max; i++) {
    if (flags[i]) for (let j = i * i; j <= max; j += i) flags[j] = 0;
  }
  const primes = new Set<number>();
  for (let i = 2; i <= max; i++) if (flags[i]) primes.add(i);
  return primes;
}

const COLS = 48;
const ROWS = 29;
const TOTAL = COLS * ROWS;
const AXIS_INTERVAL = 7;

const PrimeGrid = () => {
  const primes = useMemo(() => sievePrimes(TOTAL + 1), []);

  const dots = useMemo(() => {
    const result: boolean[] = new Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      result[i] = primes.has(i + 1);
    }
    return result;
  }, [primes]);

  /* Column axis labels (top edge, every 7th column) */
  const colLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    for (let c = AXIS_INTERVAL - 1; c < COLS; c += AXIS_INTERVAL) {
      labels.push({ col: c, label: String(c + 1).padStart(2, "0") });
    }
    return labels;
  }, []);

  /* Row axis labels (left edge, every 7th row) */
  const rowLabels = useMemo(() => {
    const labels: { row: number; label: string }[] = [];
    for (let r = AXIS_INTERVAL - 1; r < ROWS; r += AXIS_INTERVAL) {
      labels.push({ row: r, label: String(r + 1).padStart(2, "0") });
    }
    return labels;
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none select-none"
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        padding: "2rem",
        gap: 0,
      }}
    >
      {dots.map((isPrime, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const isColLabel = row === 0 && (col + 1) % AXIS_INTERVAL === 0;
        const isRowLabel = col === 0 && (row + 1) % AXIS_INTERVAL === 0;

        return (
          <div key={i} className="relative flex items-center justify-center">
            <div
              className={
                isPrime
                  ? "w-[2px] h-[2px] rounded-full bg-primary/[0.08]"
                  : "w-[1.5px] h-[1.5px] rounded-full bg-foreground/[0.025]"
              }
            />
            {isColLabel && (
              <span className="absolute -top-3 font-mono text-[0.5rem] text-foreground/[0.04] select-none">
                {String(col + 1).padStart(2, "0")}
              </span>
            )}
            {isRowLabel && (
              <span className="absolute -left-4 font-mono text-[0.5rem] text-foreground/[0.04] select-none">
                {String(row + 1).padStart(2, "0")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrimeGrid;
