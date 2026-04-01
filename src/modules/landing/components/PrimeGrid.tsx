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

const PrimeGrid = () => {
  const primes = useMemo(() => sievePrimes(TOTAL + 1), []);

  const dots = useMemo(() => {
    const result: boolean[] = new Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      result[i] = primes.has(i + 1);
    }
    return result;
  }, [primes]);

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
      {dots.map((isPrime, i) => (
        <div key={i} className="flex items-center justify-center">
          <div
            className={
              isPrime
                ? "w-[2px] h-[2px] rounded-full bg-primary/[0.08]"
                : "w-[1.5px] h-[1.5px] rounded-full bg-foreground/[0.025]"
            }
          />
        </div>
      ))}
    </div>
  );
};

export default PrimeGrid;
