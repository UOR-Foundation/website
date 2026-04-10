/**
 * OntologyPanel — Live Persona Switcher & Vocabulary Explorer
 * ═════════════════════════════════════════════════════════════════
 *
 * Single-source vocabulary table that reads ALL_CONCEPTS and resolves
 * labels through labelForProfile(). Switching profiles instantly
 * re-renders every term — no duplication, no secondary data stores.
 */

import { useState, useMemo } from "react";
import { Code2, User, FlaskConical, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import {
  ALL_CONCEPTS,
  ALL_PROFILES,
  labelForProfile,
  describeProfile,
  type OntologyProfile,
  type SkosConcept,
} from "@/modules/platform/ontology";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/platform/core/ui/tooltip";

// ── Profile metadata ────────────────────────────────────────────

const PROFILE_META: Record<OntologyProfile, { icon: typeof Code2; color: string }> = {
  developer: { icon: Code2, color: "text-blue-400" },
  user:      { icon: User, color: "text-emerald-400" },
  scientist: { icon: FlaskConical, color: "text-amber-400" },
};

// ── Component ───────────────────────────────────────────────────

export default function OntologyPanel() {
  const [profile, setProfile] = useState<OntologyProfile>("developer");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return ALL_CONCEPTS;
    const q = search.toLowerCase();
    return ALL_CONCEPTS.filter(
      (c) =>
        c["@id"].toLowerCase().includes(q) ||
        c["skos:prefLabel"].toLowerCase().includes(q) ||
        c["skos:altLabel"].some((a) => a.toLowerCase().includes(q)) ||
        c["skos:definition"].toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* ── Profile Switcher ───────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mr-1">
            Active Profile
          </span>
          {ALL_PROFILES.map((p) => {
            const meta = PROFILE_META[p];
            const Icon = meta.icon;
            const active = p === profile;
            return (
              <Tooltip key={p}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setProfile(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono capitalize transition-all ${
                      active
                        ? `bg-white/[0.08] ${meta.color} border border-white/[0.1]`
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    <Icon size={12} />
                    {p}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                  {describeProfile(p)}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="ml-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter concepts…"
              className="w-48 px-3 py-1.5 text-xs font-mono bg-white/[0.03] border border-white/[0.06] rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/15"
            />
          </div>
        </div>

        {/* ── Stats bar ──────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-white/[0.04] text-[10px] font-mono text-zinc-500">
          <span>{filtered.length} concepts</span>
          <span>·</span>
          <span>Profile: <span className={PROFILE_META[profile].color + " capitalize"}>{profile}</span></span>
          <span>·</span>
          <span>Source: vocabulary.ts (single canonical input)</span>
        </div>

        {/* ── Vocabulary Table ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[hsl(220_15%_4%)] z-10">
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-8" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  @id
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Label ({profile})
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Canonical (prefLabel)
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Namespace
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Schema.org
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((concept) => {
                const isExpanded = expanded === concept["@id"];
                const resolvedLabel = labelForProfile(concept, profile);
                const isCustom = resolvedLabel !== concept["skos:prefLabel"];

                return (
                  <ConceptRow
                    key={concept["@id"]}
                    concept={concept}
                    profile={profile}
                    resolvedLabel={resolvedLabel}
                    isCustom={isCustom}
                    isExpanded={isExpanded}
                    onToggle={() => setExpanded(isExpanded ? null : concept["@id"])}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Row Component ───────────────────────────────────────────────

function ConceptRow({
  concept,
  profile,
  resolvedLabel,
  isCustom,
  isExpanded,
  onToggle,
}: {
  concept: SkosConcept;
  profile: OntologyProfile;
  resolvedLabel: string;
  isCustom: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const closeMatches = concept["skos:closeMatch"] ?? [];
  const schemaOrg = closeMatches.find((m) => m.includes("schema.org"));

  return (
    <>
      <tr
        className="border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 text-zinc-500">
          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </td>
        <td className="px-4 py-2.5 font-mono text-zinc-400">{concept["@id"]}</td>
        <td className="px-4 py-2.5">
          <span className={isCustom ? "text-emerald-400" : "text-zinc-300"}>
            {resolvedLabel}
          </span>
          {isCustom && (
            <span className="ml-1.5 text-[9px] text-zinc-600">≠ canonical</span>
          )}
        </td>
        <td className="px-4 py-2.5 font-mono text-zinc-500">{concept["skos:prefLabel"]}</td>
        <td className="px-4 py-2.5 font-mono text-zinc-600">{concept["uor:namespace"] ?? "—"}</td>
        <td className="px-4 py-2.5">
          {schemaOrg ? (
            <span className="text-blue-400/70 font-mono text-[10px]">
              {schemaOrg.replace("https://schema.org/", "schema:")}
            </span>
          ) : (
            <span className="text-zinc-700">—</span>
          )}
        </td>
      </tr>

      {/* ── Expanded Diff Panel ────────────────────────────── */}
      {isExpanded && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={6} className="px-8 py-4 bg-white/[0.01]">
            <div className="grid grid-cols-3 gap-4 mb-3">
              {ALL_PROFILES.map((p) => {
                const meta = PROFILE_META[p];
                const Icon = meta.icon;
                const label = labelForProfile(concept, p);
                const isCurrent = p === profile;
                return (
                  <div
                    key={p}
                    className={`rounded-lg border p-3 ${
                      isCurrent ? "border-white/[0.1] bg-white/[0.03]" : "border-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={11} className={meta.color} />
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${meta.color}`}>
                        {p}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] bg-white/[0.08] px-1.5 py-0.5 rounded-full text-zinc-400 ml-auto">
                          active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-200">{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Definition */}
            <div className="text-[11px] text-zinc-400 mb-2">
              <span className="text-zinc-600 font-mono mr-1">skos:definition</span>
              {concept["skos:definition"]}
            </div>

            {/* Alt labels */}
            {concept["skos:altLabel"].length > 0 && (
              <div className="text-[11px] text-zinc-500 mb-2">
                <span className="text-zinc-600 font-mono mr-1">skos:altLabel</span>
                {concept["skos:altLabel"].join(", ")}
              </div>
            )}

            {/* External links */}
            {(concept["skos:exactMatch"]?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {concept["skos:exactMatch"]!.map((uri) => (
                  <a
                    key={uri}
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400/60 hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink size={9} />
                    {uri.replace("https://", "").slice(0, 50)}
                  </a>
                ))}
              </div>
            )}

            {closeMatches.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {closeMatches.map((uri) => (
                  <a
                    key={uri}
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400/60 hover:text-amber-400 transition-colors"
                  >
                    <ExternalLink size={9} />
                    closeMatch: {uri.replace("https://", "").slice(0, 50)}
                  </a>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
