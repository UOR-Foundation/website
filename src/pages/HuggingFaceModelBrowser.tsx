/**
 * HuggingFace Model Browser — Category-first model discovery
 * ═══════════════════════════════════════════════════════════
 *
 * Pulls real data from the HuggingFace API. Models are organized
 * by intuitive use-case categories with visual cards. Full-width,
 * high-contrast, clean grid layout.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch, IconDownload, IconCheck, IconLoader2,
  IconAlertTriangle, IconChevronDown, IconChevronUp,
  IconBrain, IconRefresh, IconExternalLink, IconStar,
  IconMessageChatbot, IconPhoto, IconMicrophone, IconLanguage,
  IconCode, IconFileText, IconEye as IconVision, IconWand,
} from "@tabler/icons-react";
import type { PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";

// ── Types ──────────────────────────────────────────────────────

interface HFModel {
  id: string;
  modelId: string;
  author?: string;
  lastModified?: string;
  private: boolean;
  gated?: string | boolean;
  pipeline_tag?: string;
  tags?: string[];
  downloads?: number;
  likes?: number;
  library_name?: string;
}

// ── Categories ─────────────────────────────────────────────────

const CATEGORIES = [
  { id: "text-generation", label: "Text Generation", icon: IconMessageChatbot, desc: "GPT, LLaMA, Mistral", color: "hsl(200, 60%, 55%)" },
  { id: "text-to-image", label: "Image Generation", icon: IconPhoto, desc: "Stable Diffusion, DALL·E", color: "hsl(280, 50%, 60%)" },
  { id: "automatic-speech-recognition", label: "Speech to Text", icon: IconMicrophone, desc: "Whisper, Wav2Vec", color: "hsl(340, 50%, 55%)" },
  { id: "translation", label: "Translation", icon: IconLanguage, desc: "NLLB, MarianMT", color: "hsl(160, 50%, 48%)" },
  { id: "text-classification", label: "Classification", icon: IconFileText, desc: "Sentiment, topic", color: "hsl(38, 55%, 52%)" },
  { id: "fill-mask", label: "Fill Mask", icon: IconWand, desc: "BERT, RoBERTa", color: "hsl(220, 50%, 55%)" },
  { id: "image-classification", label: "Vision", icon: IconVision, desc: "ViT, CLIP, ResNet", color: "hsl(100, 45%, 48%)" },
  { id: "feature-extraction", label: "Embeddings", icon: IconCode, desc: "Sentence Transformers", color: "hsl(260, 45%, 55%)" },
] as const;

const MODEL_SEEDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-seeder`;

// ── Component ──────────────────────────────────────────────────

interface Props {
  palette?: PagePalette;
}

export default function HuggingFaceModelBrowser({ palette: P }: Props) {
  const [models, setModels] = useState<HFModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [seedingModels, setSeedingModels] = useState<Record<string, "seeding" | "done" | "error">>({});
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Fallback colors for when no palette is passed
  const text = P?.text ?? "hsl(0,0%,92%)";
  const textMuted = P?.textMuted ?? "hsl(0,0%,65%)";
  const textDim = P?.textDim ?? "hsl(0,0%,40%)";
  const cardBg = P?.cardBg ?? "hsla(0,0%,12%,0.5)";
  const cardBorder = P?.cardBorder ?? "hsla(0,0%,100%,0.08)";
  const borderSubtle = P?.borderSubtle ?? "hsla(0,0%,100%,0.05)";
  const inputBg = P?.inputBg ?? "hsla(0,0%,8%,0.6)";
  const inputBorder = P?.inputBorder ?? "hsla(0,0%,100%,0.1)";
  const accent = P?.accent ?? "hsl(38,50%,55%)";
  const green = P?.green ?? "hsl(152,44%,50%)";
  const red = P?.red ?? "hsl(0,55%,55%)";
  const bg = P?.bg ?? "transparent";

  // ── Fetch models ──────────────────────────────────────────
  const fetchModels = useCallback(async (resetPage = false, categoryOverride?: string | null) => {
    const currentPage = resetPage ? 0 : page;
    setIsLoading(true);
    setError(null);
    if (resetPage) { setPage(0); setModels([]); }

    try {
      const params = new URLSearchParams({
        limit: "24",
        offset: String(currentPage * 24),
        sort: "trending",
        direction: "-1",
      });

      if (searchQuery) params.set("search", searchQuery);
      const cat = categoryOverride !== undefined ? categoryOverride : activeCategory;
      if (cat) params.set("pipeline_tag", cat);

      const url = `https://huggingface.co/api/models?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HuggingFace returned ${res.status}`);
      const data: HFModel[] = await res.json();

      if (resetPage) {
        setModels(data);
      } else {
        setModels((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 24);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeCategory, page]);

  // Initial load
  useEffect(() => { fetchModels(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchModels(true), 400);
  }, [fetchModels]);

  const handleCategoryClick = useCallback((catId: string) => {
    const next = activeCategory === catId ? null : catId;
    setActiveCategory(next);
    fetchModels(true, next);
  }, [activeCategory, fetchModels]);

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
    fetchModels(false);
  }, [fetchModels]);

  // ── Seed a model ──────────────────────────────────────────
  const seedModel = useCallback(async (modelId: string) => {
    setSeedingModels((prev) => ({ ...prev, [modelId]: "seeding" }));
    try {
      // Fetch file listing
      const res = await fetch(`https://huggingface.co/api/models/${modelId}`);
      if (!res.ok) throw new Error(`HF API ${res.status}`);
      const data = await res.json();
      const files: string[] = (data.siblings || [])
        .map((s: { rfilename: string }) => s.rfilename)
        .filter((f: string) => f.endsWith(".json") || f.endsWith(".txt") || f.endsWith(".model"));

      // Seed config files through proxy
      for (const file of files.slice(0, 5)) {
        try {
          await fetch(`${MODEL_SEEDER_URL}?file=${encodeURIComponent(file)}&model=${encodeURIComponent(modelId)}`, { redirect: "follow" });
        } catch { /* continue */ }
      }
      setSeedingModels((prev) => ({ ...prev, [modelId]: "done" }));
    } catch {
      setSeedingModels((prev) => ({ ...prev, [modelId]: "error" }));
    }
  }, []);

  const fmt = (n?: number) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Category Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {CATEGORIES.map(({ id, label, icon: Icon, desc, color }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => handleCategoryClick(id)}
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: isActive ? `${color}12` : cardBg,
                border: `1px solid ${isActive ? `${color}40` : cardBorder}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}15`, border: `1px solid ${color}25`,
              }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: isActive ? color : text, margin: 0 }}>{label}</p>
                <p style={{ fontSize: "11px", color: textDim, margin: "2px 0 0" }}>{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <IconSearch size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: textDim }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search models… (e.g. llama, whisper, stable-diffusion)"
            style={{
              width: "100%", padding: "12px 14px 12px 40px", borderRadius: "12px",
              background: inputBg, border: `1px solid ${inputBorder}`, color: text,
              fontSize: "14px", outline: "none",
            }}
          />
        </div>
        <button
          onClick={() => fetchModels(true)}
          disabled={isLoading}
          style={{
            padding: "12px", borderRadius: "12px",
            background: cardBg, border: `1px solid ${cardBorder}`,
            cursor: "pointer", color: textMuted,
            display: "flex", alignItems: "center",
          }}
        >
          <IconRefresh size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Active filter badge */}
      {activeCategory && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: textMuted }}>Showing:</span>
          <span style={{
            fontSize: "12px", padding: "4px 10px", borderRadius: "6px",
            background: `${accent}15`, color: accent, border: `1px solid ${accent}25`,
          }}>
            {CATEGORIES.find(c => c.id === activeCategory)?.label}
          </span>
          <button onClick={() => { setActiveCategory(null); fetchModels(true, null); }}
            style={{ fontSize: "11px", color: textDim, cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}>
            Clear
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px",
          borderRadius: "12px", background: `${red}10`, border: `1px solid ${red}20`,
          color: red, fontSize: "13px",
        }}>
          <IconAlertTriangle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => fetchModels(true)}
            style={{ fontSize: "12px", color: accent, cursor: "pointer", background: "none", border: "none", fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Model Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {models.map((model) => {
          const seedStatus = seedingModels[model.id];
          return (
            <div key={model.id} style={{
              padding: "16px", borderRadius: "14px",
              background: cardBg, border: `1px solid ${cardBorder}`,
              transition: "border-color 0.2s",
            }}>
              {/* Name + link */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: text, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {model.id.split("/").pop()}
                </h3>
                <a href={`https://huggingface.co/${model.id}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: textDim, flexShrink: 0 }}>
                  <IconExternalLink size={13} />
                </a>
              </div>

              {/* Author */}
              <p style={{ fontSize: "11px", color: textDim, margin: "0 0 8px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {model.id}
              </p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                {model.pipeline_tag && (
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "5px",
                    background: `${accent}12`, color: accent, border: `1px solid ${accent}20`,
                  }}>
                    {model.pipeline_tag}
                  </span>
                )}
                {model.library_name && (
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "5px",
                    background: borderSubtle, color: textMuted,
                  }}>
                    {model.library_name}
                  </span>
                )}
                {model.gated && (
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "5px",
                    background: "hsla(38,60%,50%,0.1)", color: "hsl(38,60%,55%)", border: "1px solid hsla(38,60%,50%,0.2)",
                  }}>
                    Gated
                  </span>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: textMuted, marginBottom: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <IconDownload size={13} /> {fmt(model.downloads)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <IconStar size={13} /> {fmt(model.likes)}
                </span>
              </div>

              {/* Seed button */}
              <button
                onClick={() => seedModel(model.id)}
                disabled={seedStatus === "seeding"}
                style={{
                  width: "100%", padding: "8px", borderRadius: "8px",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: "all 0.2s",
                  ...(seedStatus === "done" ? {
                    background: `${green}15`, color: green, border: `1px solid ${green}25`,
                  } : seedStatus === "seeding" ? {
                    background: `${accent}10`, color: accent, border: `1px solid ${accent}20`,
                  } : seedStatus === "error" ? {
                    background: `${red}10`, color: red, border: `1px solid ${red}20`,
                  } : {
                    background: `${accent}12`, color: accent, border: `1px solid ${accent}25`,
                  }),
                }}
              >
                {seedStatus === "seeding" ? (<><IconLoader2 size={13} className="animate-spin" /> Seeding…</>) :
                 seedStatus === "done" ? (<><IconCheck size={13} /> Seeded</>) :
                 seedStatus === "error" ? (<><IconAlertTriangle size={13} /> Retry</>) :
                 (<><IconDownload size={13} /> Seed to Cache</>)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", gap: "10px", fontSize: "13px", color: textMuted }}>
          <IconLoader2 size={18} className="animate-spin" /> Loading models from HuggingFace…
        </div>
      )}

      {/* Load More */}
      {!isLoading && hasMore && models.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={loadMore}
            style={{
              padding: "10px 32px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
              background: cardBg, border: `1px solid ${cardBorder}`, color: text, cursor: "pointer",
            }}>
            Load More
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && models.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "48px", color: textMuted, fontSize: "14px" }}>
          No models found. Try a different search or category.
        </div>
      )}
    </div>
  );
}
