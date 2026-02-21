import { useState } from "react";
import {
  ChevronDown,
  Diamond,
  Hash,
  Layers,
  Search,
  ShieldCheck,
  ArrowRightLeft,
  HardDrive,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LayerData } from "@/data/api-layers";
import { EndpointPanel } from "./EndpointPanel";

const iconMap: Record<string, LucideIcon> = {
  Diamond, Hash, Layers, Search, ShieldCheck, ArrowRightLeft, HardDrive,
};

export function LayerSection({ layer, index }: { layer: LayerData; index: number }) {
  const isLinkedFromHash = typeof window !== "undefined" && window.location.hash === `#${layer.id}`;
  const [open, setOpen] = useState(index === 0 || isLinkedFromHash);
  const Icon = iconMap[layer.iconKey] ?? Diamond;

  return (
    <div
      id={layer.id}
      className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-sm animate-fade-in-up scroll-mt-28"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Layer header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 md:p-7 cursor-pointer text-left"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
              Layer {layer.layerNum}
            </span>
            <span className="text-muted-foreground/25">·</span>
            <h3 className="font-display text-lg md:text-xl font-bold text-foreground">
              {layer.title}
            </h3>
          </div>
          {!open && (
            <p className="text-sm md:text-base font-body text-muted-foreground/65 mt-1.5 leading-relaxed">
              {layer.oneLiner}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground/40 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expandable body */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 md:px-7 pb-7 pt-0 space-y-6">
            {/* Layer description */}
            <div className="ml-14 md:ml-16 space-y-3">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {layer.whyItMatters}
              </p>
              <p className="text-sm font-semibold text-primary/70 leading-relaxed">
                {layer.solves}
              </p>
            </div>

            {/* Live endpoints */}
            <div className="space-y-3">
              {layer.endpoints.map(ep => (
                <EndpointPanel key={ep.operationId} ep={ep} />
              ))}
            </div>

            {/* V2 stubs */}
            {layer.v2stubs && layer.v2stubs.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2 mt-1">Coming in v2</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {layer.v2stubs.map(stub => (
                    <div key={stub.path} className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-3 opacity-65">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-foreground">{stub.label}</p>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">501</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{stub.description}</p>
                      <code className="font-mono text-[10px] text-muted-foreground/60">{stub.path}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
