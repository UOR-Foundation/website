const codeSnippet = `// Any content produces a deterministic UOR address.
// Same input → same address, on any node, forever.

import { resolve } from "@uor/core";

const address = resolve(85);
// → { value: 85, weight: 2, components: [5, 17] }

// Verify: the address is derived purely from content.
// No registry. No coordinator. No trust required.
console.log(address.value === 5 * 17); // true`;

const CodeExampleSection = () => {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="container">
        <p className="font-body font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-5 md:mb-6" style={{ fontSize: 'clamp(14px, 1vw, 18px)' }}>
          See It Work
        </p>
        <div className="h-px w-full bg-border/60" />
        <div className="py-8 md:py-12 max-w-4xl">
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
              <span className="w-3 h-3 rounded-full bg-muted-foreground/15" />
              <span className="w-3 h-3 rounded-full bg-muted-foreground/15" />
              <span className="w-3 h-3 rounded-full bg-muted-foreground/15" />
              <span className="ml-2 text-muted-foreground/50 font-mono" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>example.ts</span>
            </div>
            <pre className="p-5 md:p-6 overflow-x-auto leading-[1.7] font-mono text-foreground/80" style={{ fontSize: 'clamp(14px, 0.9vw, 18px)' }}>
              <code>{codeSnippet}</code>
            </pre>
          </div>
          <p className="mt-5 text-muted-foreground font-body leading-relaxed" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
            Every UOR address is a prime factorization. The address IS the proof. No lookup table, no external authority.
          </p>
        </div>
        <div className="h-px w-full bg-border/60" />
      </div>
    </section>
  );
};

export default CodeExampleSection;
