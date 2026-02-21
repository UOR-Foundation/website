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
    summary: "The ground rules that make everything else possible.",
    description:
      "Everything in UOR rests on a small set of mathematical rules that can be verified by anyone, on any machine, in under a second. These rules guarantee that every operation in the system produces the same result no matter who runs it or where. Think of it as the bedrock: if the foundation holds, every layer above it is reliable. This is what makes UOR trustworthy by design, not by promise.",
    namespaces: [
      { label: "Axioms", url: "https://uor-foundation.github.io/UOR-Framework/docs/overview.html" },
    ],
  },
  {
    number: 1,
    icon: Hash,
    title: "Identity",
    summary: "Every piece of data gets one permanent name, based on what it is.",
    description:
      "Today, the same file can have different names on different systems. UOR solves this by giving every piece of data a single, permanent address derived from its actual content. If two systems hold the same data, they automatically arrive at the same address, with no coordination needed. This means you can always verify that data has not been altered, and you never lose track of what something is, no matter where it moves.",
    namespaces: [
      { label: "Content Addressing", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/u/" },
      { label: "Schema", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/schema/" },
    ],
  },
  {
    number: 2,
    icon: Layers,
    title: "Structure",
    summary: "How things combine and break apart without losing information.",
    description:
      "Complex data can always be broken down into its simplest parts, and those parts can always be reassembled into the original, with nothing lost. This works the same way every time, regardless of the system. It means you can confidently split, merge, and transform data across tools and platforms, knowing the result will always be complete and accurate.",
    namespaces: [
      { label: "Operations", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/op/" },
      { label: "Partitions", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/partition/" },
    ],
  },
  {
    number: 3,
    icon: Search,
    title: "Resolution",
    summary: "Find anything by describing what you need.",
    description:
      "Instead of knowing where data is stored, you describe what you are looking for. The system finds the right data for you, no matter which database, server, or application holds it. This eliminates the need for manual lookups, custom connectors, or knowing the internal structure of someone else's system. You ask for what you need, and the framework resolves it.",
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
    summary: "Every claim is backed by proof, not promises.",
    description:
      "Every operation produces a verifiable receipt: a proof that shows exactly what was done, step by step. Anyone can check these proofs independently, without contacting the original system. This replaces trust in institutions or intermediaries with trust in mathematics. If someone claims a result, you can verify it yourself.",
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
    summary: "Convert between formats without losing meaning.",
    description:
      "Data often needs to move between different systems, formats, or representations. This layer ensures that when data is converted from one form to another, its meaning and structure are fully preserved. Nothing is lost in translation. This is what makes true interoperability possible: systems that speak different languages can exchange data reliably, because the framework guarantees that the meaning stays intact.",
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
