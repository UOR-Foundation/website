/**
 * ContextPills — Dismissible pills showing selected vault documents as search context.
 */

import { Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { VaultDocument } from "../lib/types";

interface Props {
  documents: VaultDocument[];
  onRemove: (docId: string) => void;
  className?: string;
}

function truncate(s: string, max = 14): string {
  if (!s) return "Untitled";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export default function ContextPills({ documents, onRemove, className = "" }: Props) {
  if (documents.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <AnimatePresence mode="popLayout">
        {documents.map((doc) => (
          <motion.button
            key={doc.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={() => onRemove(doc.id)}
            className="inline-flex items-center gap-1 h-7 pl-2 pr-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors group"
            title={doc.filename || "Untitled"}
          >
            <Shield className="w-3 h-3 shrink-0" />
            <span>{truncate(doc.filename || "Untitled")}</span>
            <X className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
