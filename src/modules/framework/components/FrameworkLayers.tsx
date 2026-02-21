import { useState } from "react";
import { Hash, Layers, Search, ShieldCheck, ArrowRightLeft, ExternalLink, Diamond, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NamespaceLink {
  label: string;
  url: string;
}

interface Layer {
  number: number;
  icon: LucideIcon;
  title: string;
  summary: string;
  description: string;
  namespaces: NamespaceLink[];
}

const layers: Layer[] = [
  {
    number: 0,
    icon: Diamond,
    title: "The Foundation",
    summary: "The mathematical rules every object must obey.",
    description:
      "The absolute base layer. The formal signature Σ = {neg, bnot, xor, and, or} defines five primitive operations over the carrier set Z/(2^bits)Z. The two primitive involutions neg and bnot generate the dihedral group D_{2^n}. The critical identity neg(bnot(x)) = succ(x) means closure under both involutions implies closure under successor, generating the entire ring. Quantum scaling at 8 × (N+1) bits per value allows the framework to scale from 8-bit (256 states) to arbitrary precision. Three closure modes govern graph computation: ONE_STEP (single application), FIXED_POINT (iterate to convergence), and GRAPH_CLOSED (verified referential integrity). Without these constraints, higher-order structure cannot emerge. With them, every layer above is inevitable.",
    namespaces: [
      { label: "Axioms", url: "https://uor-foundation.github.io/UOR-Framework/docs/overview.html" },
    ],
  },
  {
    number: 1,
    icon: Hash,
    title: "Identity",
    summary: "One permanent address per object, based on content.",
    description:
      "Every object gets a permanent symbolic address based on what it contains, not where it is stored. The same content always resolves to the same address, no matter which system holds it. Identity is enforced through 8 canonicalization rules: (1) involution cancellation, (2) derived expansion (succ → neg∘bnot), (3) constant reduction mod 2^bits, (4) AC flatten+sort for xor/and/or, (5) identity elimination, (6) annihilator reduction, (7) self-cancellation (x xor x → 0), and (8) idempotence. Each object is structured as a formal Triad(stratum, spectrum, glyph) — the ring-layer index (popcount), the bit-pattern representation, and the Braille content address. A shared vocabulary of core data types ensures consistency across the entire space.",
    namespaces: [
      { label: "Content Addressing", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/u/" },
      { label: "Schema", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/schema/" },
    ],
  },
  {
    number: 2,
    icon: Layers,
    title: "Structure",
    summary: "How objects combine, decompose, and transform.",
    description:
      "Objects combine, decompose, and transform through precise geometric and algebraic rules. Every complex structure can be broken down into its simplest, irreducible parts, and rebuilt without loss. This guarantees that composition is always lossless and reversible.",
    namespaces: [
      { label: "Operations", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/op/" },
      { label: "Partitions", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/partition/" },
    ],
  },
  {
    number: 3,
    icon: Search,
    title: "Resolution",
    summary: "Find anything by what it is, not where it lives.",
    description:
      "Find any object by describing what you need, not by knowing where it lives. Type declarations define intent, resolvers locate the right data, and queries extract exactly the information required.",
    namespaces: [
      { label: "Type System", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/type/" },
      { label: "Resolvers", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/resolver/" },
      { label: "Queries", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/query/" },
    ],
  },
  {
    number: 4,
    icon: ShieldCheck,
    title: "Verification",
    summary: "Every operation is mathematically provable.",
    description:
      "Every operation is mathematically verifiable. Proofs confirm correctness, certificates attest to structural properties, derivations show each step of computation, and traces provide a complete audit trail. Trust is built into the system, not bolted on.",
    namespaces: [
      { label: "Proofs", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/proof/" },
      { label: "Certificates", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/cert/" },
      { label: "Derivations", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/derivation/" },
      { label: "Traces", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/trace/" },
    ],
  },
  {
    number: 5,
    icon: ArrowRightLeft,
    title: "Transformation",
    summary: "Move between representations without losing meaning.",
    description:
      "Objects move between symbolic representations while preserving their essential geometric properties. Measurable quantities track structure. State management handles context, bindings, and lifecycle transitions across systems.",
    namespaces: [
      { label: "Morphisms", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/morphism/" },
      { label: "Observables", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/observable/" },
      { label: "State", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/state/" },
    ],
  },
];

const FrameworkLayers = () => {
  const [openLayers, setOpenLayers] = useState<Set<number>>(new Set([0]));

  const toggleLayer = (num: number) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {layers.map((layer, index) => {
        const isOpen = openLayers.has(layer.number);
        return (
          <div
            key={layer.number}
            className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-lg animate-fade-in-up"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {/* Header */}
            <button
              onClick={() => toggleLayer(layer.number)}
              className="w-full flex items-center gap-4 p-5 md:p-7 cursor-pointer text-left"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                <layer.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
                    Layer {layer.number}
                  </span>
                  <span className="text-muted-foreground/25">·</span>
                  <h3 className="font-display text-lg md:text-xl font-bold text-foreground">
                    {layer.title}
                  </h3>
                </div>
                {!isOpen && (
                  <p className="text-sm md:text-base font-body text-muted-foreground/65 mt-1.5 leading-relaxed">
                    {layer.summary}
                  </p>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground/40 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Expandable content */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="px-5 md:px-7 pb-6 md:pb-7 pt-0 ml-14 md:ml-16">
                  <p className="text-muted-foreground font-body text-sm md:text-base leading-relaxed">
                    {layer.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {layer.namespaces.map((ns) => (
                      <a
                        key={ns.label}
                        href={ns.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-body font-medium border border-border text-muted-foreground bg-muted/30 hover:border-primary/30 hover:text-primary transition-colors duration-200"
                      >
                        {ns.label}
                        <ExternalLink className="w-3 h-3 opacity-40" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FrameworkLayers;
