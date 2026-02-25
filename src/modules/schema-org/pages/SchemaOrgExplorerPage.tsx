/**
 * Schema.org Explorer — Interactive dual-representation browser.
 *
 * Browse all 806 Schema.org types with their UOR content-addressed identities.
 * Search, inspect type hierarchies, and verify the functor in real time.
 *
 * @module schema-org/pages/SchemaOrgExplorerPage
 */

import { useState, useCallback, useMemo } from "react";
import { IconSearch, IconArrowRight, IconHash, IconBinaryTree, IconShieldCheck, IconLoader2 } from "@tabler/icons-react";
import {
  SCHEMA_ORG_HIERARCHY,
  SCHEMA_ORG_TYPE_NAMES,
  SCHEMA_ORG_TYPE_COUNT,
  getAncestorChain,
  getChildren,
  getDepth,
} from "../vocabulary";
import { addressType } from "../functor";
import type { SchemaOrgUorIdentity } from "../types";

// ── Top-level type categories for the overview grid ────────────────────────

const TOP_CATEGORIES = [
  { name: "Thing", desc: "Root type — everything inherits from Thing", icon: "🌐" },
  { name: "Action", desc: "Operations, tasks, interactions", icon: "⚡" },
  { name: "CreativeWork", desc: "Articles, books, movies, code", icon: "📝" },
  { name: "Event", desc: "Conferences, concerts, deliveries", icon: "📅" },
  { name: "Intangible", desc: "Brands, offers, quantities, ratings", icon: "💭" },
  { name: "Organization", desc: "Companies, schools, NGOs", icon: "🏢" },
  { name: "Person", desc: "Individual people", icon: "👤" },
  { name: "Place", desc: "Locations, landmarks, venues", icon: "📍" },
  { name: "Product", desc: "Physical/digital products", icon: "📦" },
  { name: "MedicalEntity", desc: "Drugs, conditions, procedures", icon: "🏥" },
  { name: "BioChemEntity", desc: "Genes, proteins, molecules", icon: "🧬" },
  { name: "Taxon", desc: "Biological taxonomy", icon: "🌿" },
];

// ── TypeCard ───────────────────────────────────────────────────────────────

function TypeCard({
  typeName,
  onSelect,
  isSelected,
}: {
  typeName: string;
  onSelect: (name: string) => void;
  isSelected: boolean;
}) {
  const childCount = getChildren(typeName).length;
  const depth = getDepth(typeName);
  const cat = TOP_CATEGORIES.find((c) => c.name === typeName);

  return (
    <button
      onClick={() => onSelect(typeName)}
      className={`text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border/40 bg-card/50 hover:border-primary/40 hover:bg-card/80"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {cat && <span className="text-lg">{cat.icon}</span>}
        <span className="font-semibold font-body text-foreground">{typeName}</span>
      </div>
      {cat && (
        <p className="text-xs text-muted-foreground mb-2">{cat.desc}</p>
      )}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <IconBinaryTree size={12} />
          {childCount} subtypes
        </span>
        <span>depth {depth}</span>
      </div>
    </button>
  );
}

// ── IdentityPanel ──────────────────────────────────────────────────────────

function IdentityPanel({
  typeName,
  identity,
  loading,
}: {
  typeName: string;
  identity: SchemaOrgUorIdentity | null;
  loading: boolean;
}) {
  const ancestors = getAncestorChain(typeName);
  const children = getChildren(typeName);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconHash size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">
            {typeName}
          </h3>
          <a
            href={`https://schema.org/${typeName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            schema.org/{typeName} ↗
          </a>
        </div>
      </div>

      {/* Hierarchy chain */}
      <div className="p-3 rounded-lg border border-border/30 bg-card/30">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Inheritance Chain
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {ancestors.map((a, i) => (
            <span key={a} className="flex items-center gap-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  i === 0
                    ? "bg-primary/15 text-primary font-semibold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {a}
              </span>
              {i < ancestors.length - 1 && (
                <IconArrowRight size={10} className="text-muted-foreground/50" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="p-3 rounded-lg border border-border/30 bg-card/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Direct Subtypes ({children.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {children.slice(0, 30).map((c) => (
              <span
                key={c}
                className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono"
              >
                {c}
              </span>
            ))}
            {children.length > 30 && (
              <span className="text-[11px] text-muted-foreground">
                +{children.length - 30} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* UOR Identity — The Dual */}
      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-1.5 mb-3">
          <IconShieldCheck size={14} className="text-primary" />
          <p className="text-xs font-semibold text-primary">
            UOR Content-Addressed Identity
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <IconLoader2 size={14} className="animate-spin" />
            Computing URDNA2015 canonical form…
          </div>
        ) : identity ? (
          <dl className="space-y-2 text-[11px] font-mono text-muted-foreground">
            <div>
              <dt className="font-semibold text-foreground/70">derivation_id</dt>
              <dd className="break-all mt-0.5">{identity.derivationId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/70">CIDv1</dt>
              <dd className="break-all mt-0.5">{identity.cid}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/70">SHA-256</dt>
              <dd className="break-all mt-0.5">{identity.hashHex}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/70">Braille Address</dt>
              <dd className="mt-0.5">{identity.uorAddress["u:glyph"]}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/70">IPv6 (ULA)</dt>
              <dd className="mt-0.5">{identity.ipv6Address["u:ipv6"]}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Click "Compute Identity" to content-address this type
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SchemaOrgExplorerPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [identity, setIdentity] = useState<SchemaOrgUorIdentity | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter types by search
  const filteredTypes = useMemo(() => {
    if (!search.trim()) return TOP_CATEGORIES.map((c) => c.name);
    const q = search.toLowerCase();
    return SCHEMA_ORG_TYPE_NAMES.filter((name) =>
      name.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [search]);

  // Compute identity when a type is selected
  const computeIdentity = useCallback(async (typeName: string) => {
    setLoading(true);
    setIdentity(null);
    try {
      const id = await addressType(typeName);
      setIdentity(id);
    } catch (err) {
      console.error("Failed to compute identity:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      setSelected(name);
      computeIdentity(name);
    },
    [computeIdentity]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">🔗</span>
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Schema.org × UOR Functor
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl font-body">
            <strong>F : SchemaOrg → UOR</strong> — Every Schema.org type has a dual
            representation: its original JSON-LD form (web-readable) and a UOR
            canonical form (content-addressed). One functor. {SCHEMA_ORG_TYPE_COUNT} types. Zero per-type code.
          </p>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {SCHEMA_ORG_TYPE_COUNT} types
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/60" />
              {TOP_CATEGORIES.length} top-level categories
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/30" />
              URDNA2015 canonical
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={`Search ${SCHEMA_ORG_TYPE_COUNT} types…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-card/50 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Type grid */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {search.trim()
                ? `${filteredTypes.length} matching types`
                : "Top-Level Categories"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTypes.map((name) => (
                <TypeCard
                  key={name}
                  typeName={name}
                  onSelect={handleSelect}
                  isSelected={selected === name}
                />
              ))}
            </div>

            {filteredTypes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No types match "{search}"
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Dual Representation
              </h2>
              {selected ? (
                <IdentityPanel
                  typeName={selected}
                  identity={identity}
                  loading={loading}
                />
              ) : (
                <div className="p-8 rounded-xl border border-border/30 bg-card/30 text-center">
                  <p className="text-sm text-muted-foreground">
                    Select a type to view its dual representation
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Schema.org JSON-LD ↔ UOR Content Address
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
