import { motion } from "framer-motion";
import { Sparkles, BookOpen, Atom } from "lucide-react";
import type { Invariant } from "@/modules/intelligence/oracle/lib/stream-resonance";

interface Props {
  invariant: Invariant;
  index: number;
}

export default function InvariantCard({ invariant, index }: Props) {
  const resonancePct = Math.round(invariant.resonance * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.12, duration: 0.5 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden hover:border-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground">{invariant.name}</h3>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resonancePct}%` }}
                transition={{ delay: index * 0.12 + 0.3, duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
              />
            </div>
            <span className="text-[10px] text-white/50 font-mono">{resonancePct}%</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-white/60 leading-relaxed">{invariant.description}</p>
      </div>

      {/* UOR form */}
      <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-black/30 border border-white/5">
        <div className="flex items-center gap-1.5 mb-1">
          <Atom className="w-3 h-3 text-primary/70" />
          <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Canonical Form</span>
        </div>
        <code className="text-[11px] text-primary/80 font-mono break-all">{invariant.uor_form}</code>
      </div>

      {/* Insight */}
      <div className="mx-5 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-[11px] text-primary/90 leading-relaxed">💡 {invariant.insight}</p>
      </div>

      {/* Footer: books + domains */}
      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
        {invariant.domains.map((d) => (
          <span key={d} className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-white/50 uppercase tracking-wider">
            {d}
          </span>
        ))}
      </div>
      <div className="px-5 pb-4">
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <BookOpen className="w-3 h-3" />
          <span>{invariant.books.join(" · ")}</span>
        </div>
      </div>

      {/* Why surprising */}
      {invariant.why_surprising && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-white/30 italic">{invariant.why_surprising}</p>
        </div>
      )}
    </motion.div>
  );
}
