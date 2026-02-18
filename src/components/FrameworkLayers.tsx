import { Hash, Sigma, Search, ShieldCheck, ArrowRightLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Layer {
  number: number;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  namespaces: string[];
}

const layers: Layer[] = [
  {
    number: 1,
    icon: Hash,
    title: "Identity",
    subtitle: "Content Addressing + Schema",
    description:
      "Every object receives a unique address derived from its content. The schema layer defines the core data types (Datum, Term, and Ring) that form the substrate.",
    namespaces: ["Content Addressing", "Schema"],
  },
  {
    number: 2,
    icon: Sigma,
    title: "Algebra",
    subtitle: "Operations + Partitions",
    description:
      "Ring operations let objects compose, decompose, and transform algebraically. Partitions divide the space into irreducible components, the building blocks of all structure.",
    namespaces: ["Operations", "Partitions"],
  },
  {
    number: 3,
    icon: Search,
    title: "Resolution",
    subtitle: "Types + Resolvers + Queries",
    description:
      "Runtime types parameterize how objects are found. Resolvers map type declarations to ring partitions. Queries extract information from the substrate.",
    namespaces: ["Type System", "Resolvers", "Queries"],
  },
  {
    number: 4,
    icon: ShieldCheck,
    title: "Verification",
    subtitle: "Proofs + Certificates + Derivations + Traces",
    description:
      "Every operation produces a cryptographic proof. Certificates attest to structural properties. Derivations record rewriting steps. Traces log the full computation.",
    namespaces: ["Proofs", "Certificates", "Derivations", "Traces"],
  },
  {
    number: 5,
    icon: ArrowRightLeft,
    title: "Transformation",
    subtitle: "Morphisms + Observables + State",
    description:
      "Maps between objects: transforms, isometries, and embeddings. Observable metrics measure structure. State management handles context, bindings, and transitions.",
    namespaces: ["Morphisms", "Observables", "State"],
  },
];

const FrameworkLayers = () => {
  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-6 md:left-8 top-8 bottom-8 w-px bg-border hidden md:block" />

      <div className="flex flex-col gap-5 md:gap-6">
        {layers.map((layer, index) => (
          <div
            key={layer.number}
            className="group relative flex gap-5 md:gap-7 items-start animate-fade-in-up"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {/* Number + icon column */}
            <div className="shrink-0 flex flex-col items-center z-10">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-card border border-border flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-md">
                <layer.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-card rounded-2xl border border-border p-6 md:p-8 transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-lg">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
                  Layer {layer.number}
                </span>
                <span className="text-xs font-body text-muted-foreground/50">
                  {layer.subtitle}
                </span>
              </div>
              <h3 className="font-display text-lg md:text-xl font-bold text-foreground mb-3">
                {layer.title}
              </h3>
              <p className="text-muted-foreground font-body text-sm md:text-base leading-relaxed">
                {layer.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {layer.namespaces.map((ns) => (
                  <span
                    key={ns}
                    className="px-2.5 py-1 rounded-full text-[11px] font-body font-medium border border-border text-muted-foreground bg-muted/30"
                  >
                    {ns}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrameworkLayers;
