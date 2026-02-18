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
  description: string;
  namespaces: NamespaceLink[];
}

const layers: Layer[] = [
  {
    number: 0,
    icon: Diamond,
    title: "The Foundation",
    description:
      "The absolute base layer. It defines a small set of mathematical rules that every object in the system must obey. These rules guarantee that anything built on top behaves predictably and never loses information. Without these constraints, higher-order structure cannot emerge. With them, every layer above is inevitable.",
    namespaces: [
      { label: "Axioms", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/axiom/" },
    ],
  },
  {
    number: 1,
    icon: Hash,
    title: "Identity",
    description:
      "Every object gets a permanent symbolic address based on what it contains, not where it is stored. The same content always resolves to the same address, no matter which system holds it. A shared vocabulary of core data types ensures consistency across the entire space.",
    namespaces: [
      { label: "Content Addressing", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/u/" },
      { label: "Schema", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/schema/" },
    ],
  },
  {
    number: 2,
    icon: Layers,
    title: "Structure",
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
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-6 md:left-8 top-8 bottom-8 w-px bg-border hidden md:block" />

      <div className="flex flex-col gap-3 md:gap-4">
        {layers.map((layer, index) => {
          const isOpen = openLayers.has(layer.number);
          return (
            <div
              key={layer.number}
              className="group relative flex gap-5 md:gap-7 items-start animate-fade-in-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Icon column */}
              <div className="shrink-0 flex flex-col items-center z-10">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-card border border-border flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-md">
                  <layer.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-lg">
                {/* Collapsible header */}
                <button
                  onClick={() => toggleLayer(layer.number)}
                  className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
                      Layer {layer.number}
                    </span>
                    <span className="text-muted-foreground/30 font-body">·</span>
                    <h3 className="font-display text-lg md:text-xl font-bold text-foreground">
                      {layer.title}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground/50 shrink-0 ml-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Expandable content */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0">
                      <p className="text-muted-foreground font-body text-sm md:text-base leading-relaxed">
                        {layer.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-5">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkLayers;
