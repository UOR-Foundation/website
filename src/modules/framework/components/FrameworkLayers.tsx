import { useState } from "react";
import { Hash, Layers, Search, ShieldCheck, ArrowRightLeft, ExternalLink, Diamond, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { frameworkLayers } from "@/data/framework-layers";

const iconMap: Record<string, LucideIcon> = {
  Diamond, Hash, Layers, Search, ShieldCheck, ArrowRightLeft,
};

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
      {frameworkLayers.map((layer, index) => {
        const isOpen = openLayers.has(layer.number);
        const Icon = iconMap[layer.iconKey];
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
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
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
