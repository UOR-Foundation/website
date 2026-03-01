/**
 * Knowledge Graph Input - Manual Context Triples
 *
 * Lets users tell Lumen about themselves through natural, conversational
 * inputs that get stored as encrypted triples in their private graph.
 *
 * @module hologram-ui/components/lumen/KnowledgeGraphInput
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Trash2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateGraphCache } from "@/modules/hologram-ui/engine/contextGraphBridge";

// ── Predicate categories ────────────────────────────────────────────

const PREDICATES = [
  { value: "interested-in", label: "Interested in", icon: "\u2726", placeholder: "e.g. philosophy, quantum physics, jazz" },
  { value: "works-on", label: "Working on", icon: "\u25C8", placeholder: "e.g. quantum computing, a novel, web3" },
  { value: "expertise-in", label: "Skilled at", icon: "\u25C9", placeholder: "e.g. TypeScript, piano, data analysis" },
  { value: "goal", label: "Goal", icon: "\u25CE", placeholder: "e.g. learn Rust, build a startup, publish paper" },
  { value: "prefers", label: "Prefers", icon: "\u25C7", placeholder: "e.g. concise answers, visual explanations" },
  { value: "context", label: "Context", icon: "\u25CC", placeholder: "e.g. researcher, student, designer" },
] as const;

type PredicateKey = typeof PREDICATES[number]["value"];

// ── Smart NLP-lite parser ────────────────────────────────────────────

function parseNaturalInput(text: string): { predicate: PredicateKey; object: string } | null {
  const t = text.trim();
  if (!t) return null;

  // Match both straight and curly apostrophes
  const patterns: [RegExp, PredicateKey][] = [
    [/^i(?:'m|'m| am) (?:interested in|curious about|fascinated by) (.+)/i, "interested-in"],
    [/^i (?:like|love|enjoy) (.+)/i, "interested-in"],
    [/^interested in (.+)/i, "interested-in"],
    [/^i(?:'m|'m| am) (?:working on|building|developing|creating) (.+)/i, "works-on"],
    [/^i (?:work on|build) (.+)/i, "works-on"],
    [/^working on (.+)/i, "works-on"],
    [/^i(?:'m|'m| am) (?:good at|skilled (?:at|in)|an? expert (?:at|in)) (.+)/i, "expertise-in"],
    [/^i (?:know|understand) (.+)/i, "expertise-in"],
    [/^skilled (?:at|in) (.+)/i, "expertise-in"],
    [/^i want to (.+)/i, "goal"],
    [/^my goal is (?:to )?(.+)/i, "goal"],
    [/^i(?:'m|'m| am) (?:trying to|aiming to) (.+)/i, "goal"],
    [/^i prefer (.+)/i, "prefers"],
    [/^i(?:'m|'m| am) a (.+)/i, "context"],
    [/^i(?:'m|'m| am) (.+)/i, "context"],
  ];

  for (const [re, pred] of patterns) {
    const m = t.match(re);
    if (m?.[1]) return { predicate: pred, object: m[1].trim() };
  }

  return { predicate: "interested-in", object: t };
}

// ── Types ────────────────────────────────────────────────────────────

interface UserTriple {
  id: string;
  predicate: string;
  object: string;
  confidence: number;
  createdAt: string;
}

interface KnowledgeGraphInputProps {
  userId: string;
}

// ── Component ────────────────────────────────────────────────────────

export default function KnowledgeGraphInput({ userId }: KnowledgeGraphInputProps) {
  const [inputText, setInputText] = useState("");
  const [selectedPredicate, setSelectedPredicate] = useState<PredicateKey>("interested-in");
  const [mode, setMode] = useState<"natural" | "structured">("natural");
  const [triples, setTriples] = useState<UserTriple[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTriples = useCallback(async () => {
    const { data } = await supabase
      .from("messenger_context_graph")
      .select("id, triple_predicate, triple_object, confidence, created_at")
      .eq("user_id", userId)
      .neq("source_type", "resonance-observer")
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      setTriples(data.map(t => ({
        id: t.id,
        predicate: t.triple_predicate,
        object: t.triple_object,
        confidence: t.confidence,
        createdAt: t.created_at,
      })));
    }
  }, [userId]);

  useEffect(() => { loadTriples(); }, [loadTriples]);

  const parsed = mode === "natural" ? parseNaturalInput(inputText) : null;
  const effectivePredicate = mode === "natural" ? (parsed?.predicate ?? "interested-in") : selectedPredicate;
  const effectiveObject = mode === "natural" ? (parsed?.object ?? inputText.trim()) : inputText.trim();
  const predicateInfo = PREDICATES.find(p => p.value === effectivePredicate);

  const handleSubmit = useCallback(async () => {
    if (!effectiveObject || saving) return;
    setSaving(true);
    try {
      await supabase.from("messenger_context_graph").insert({
        user_id: userId,
        triple_subject: "user:self",
        triple_predicate: effectivePredicate,
        triple_object: effectiveObject,
        confidence: 1.0,
        source_type: "user-authored",
        source_id: "manual:" + Date.now(),
      });
      invalidateGraphCache();
      setInputText("");
      await loadTriples();
    } finally {
      setSaving(false);
    }
  }, [userId, effectivePredicate, effectiveObject, saving, loadTriples]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await supabase.from("messenger_context_graph").delete().eq("id", id);
      invalidateGraphCache();
      setTriples(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const groupedTriples = PREDICATES.reduce((acc, p) => {
    const items = triples.filter(t => t.predicate === p.value);
    if (items.length > 0) acc.push({ ...p, items });
    return acc;
  }, [] as (typeof PREDICATES[number] & { items: UserTriple[] })[]);

  const knownPredicates = new Set<string>(PREDICATES.map(p => p.value));
  const uncategorized = triples.filter(t => !knownPredicates.has(t.predicate));

  return (
    <section>
      <h3
        className="text-xs font-medium tracking-widest uppercase mb-3 flex items-center gap-2"
        style={{ color: "hsl(30, 10%, 55%)" }}
      >
        <BookOpen size={12} /> Knowledge Graph
      </h3>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => setMode("natural")}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{
            color: mode === "natural" ? "hsl(38, 50%, 55%)" : "hsl(30, 10%, 55%)",
            background: mode === "natural" ? "hsla(38, 50%, 55%, 0.1)" : "transparent",
          }}
        >
          <Sparkles size={10} className="inline mr-1" />
          Natural
        </button>
        <button
          onClick={() => setMode("structured")}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{
            color: mode === "structured" ? "hsl(38, 50%, 55%)" : "hsl(30, 10%, 55%)",
            background: mode === "structured" ? "hsla(38, 50%, 55%, 0.1)" : "transparent",
          }}
        >
          Structured
        </button>
      </div>

      {/* Structured predicate selector */}
      <AnimatePresence>
        {mode === "structured" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PREDICATES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPredicate(p.value)}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{
                    color: selectedPredicate === p.value ? "hsl(38, 50%, 55%)" : "hsl(30, 10%, 55%)",
                    background: selectedPredicate === p.value ? "hsla(38, 50%, 55%, 0.1)" : "hsla(38, 30%, 40%, 0.04)",
                    border: "1px solid " + (selectedPredicate === p.value ? "hsla(38, 50%, 55%, 0.2)" : "transparent"),
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "natural"
                ? "Tell Lumen about yourself..."
                : (predicateInfo?.placeholder ?? "Enter a value...")
            }
            className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
            style={{
              background: "hsla(38, 30%, 40%, 0.06)",
              border: "1px solid hsla(38, 30%, 40%, 0.1)",
              color: "hsl(38, 15%, 82%)",
            }}
          />
          {mode === "natural" && inputText.trim() && parsed && (
            <div
              className="absolute left-3 -bottom-5 text-xs flex items-center gap-1.5"
              style={{ color: "hsl(38, 50%, 55%)" }}
            >
              <span style={{ opacity: 0.6 }}>
                {PREDICATES.find(p => p.value === parsed.predicate)?.icon}
              </span>
              {PREDICATES.find(p => p.value === parsed.predicate)?.label}:{" "}
              {parsed.object}
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!effectiveObject || saving}
          className="p-2 rounded-lg transition-all shrink-0"
          style={{
            background: effectiveObject ? "hsla(38, 50%, 55%, 0.15)" : "hsla(38, 30%, 40%, 0.04)",
            color: effectiveObject ? "hsl(38, 50%, 55%)" : "hsl(30, 10%, 55%)",
            opacity: saving ? 0.5 : 1,
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Existing triples */}
      {(groupedTriples.length > 0 || uncategorized.length > 0) && (
        <div className="mt-6 space-y-3">
          {groupedTriples.map(group => (
            <div key={group.value}>
              <p className="text-xs mb-1.5 flex items-center gap-1" style={{ color: "hsl(30, 10%, 55%)" }}>
                <span>{group.icon}</span> {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(t => (
                  <motion.span
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full group cursor-default"
                    style={{
                      background: "hsla(38, 30%, 40%, 0.08)",
                      color: "hsl(38, 15%, 82%)",
                      border: "1px solid hsla(38, 30%, 40%, 0.1)",
                    }}
                  >
                    {t.object}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                      style={{ color: "hsl(0, 50%, 60%)" }}
                      disabled={deleting === t.id}
                    >
                      <Trash2 size={10} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: "hsl(30, 10%, 55%)" }}>Other</p>
              <div className="flex flex-wrap gap-1.5">
                {uncategorized.map(t => (
                  <motion.span
                    key={t.id}
                    layout
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full group cursor-default"
                    style={{
                      background: "hsla(38, 30%, 40%, 0.08)",
                      color: "hsl(38, 15%, 82%)",
                      border: "1px solid hsla(38, 30%, 40%, 0.1)",
                    }}
                  >
                    <span style={{ color: "hsl(30, 10%, 55%)" }}>
                      {t.predicate}:
                    </span>
                    {" "}{t.object}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                      style={{ color: "hsl(0, 50%, 60%)" }}
                      disabled={deleting === t.id}
                    >
                      <Trash2 size={10} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {triples.length === 0 && (
        <p className="text-xs mt-3 text-center" style={{ color: "hsl(30, 8%, 42%)" }}>
          No knowledge added yet. Tell Lumen about yourself to get more relevant responses.
        </p>
      )}
    </section>
  );
}
