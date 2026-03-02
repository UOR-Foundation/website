/**
 * HuggingFace Model Browser — Browse, search & seed models from HuggingFace Hub
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mirrors the HuggingFace catalog with live search, filtering, and one-click
 * model seeding through our model-seeder edge function. Provides detailed
 * expert-level logs for every operation.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch, IconDownload, IconCheck, IconLoader2,
  IconAlertTriangle, IconChevronDown, IconChevronUp,
  IconBrain, IconFilter, IconRefresh, IconTerminal2,
  IconExternalLink, IconTrendingUp, IconStar,
} from "@tabler/icons-react";

// ── Types ──────────────────────────────────────────────────────

interface HFModel {
  id: string;             // e.g. "meta-llama/Llama-3.2-1B"
  modelId: string;
  author?: string;
  sha?: string;
  lastModified?: string;
  private: boolean;
  disabled?: boolean;
  gated?: string | boolean;
  pipeline_tag?: string;
  tags?: string[];
  downloads?: number;
  likes?: number;
  library_name?: string;
  createdAt?: string;
}

interface SeedLogEntry {
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

interface SeedingState {
  modelId: string;
  status: "idle" | "seeding" | "done" | "error";
  files: { name: string; status: "pending" | "seeding" | "done" | "error"; size?: string }[];
  logs: SeedLogEntry[];
}

// ── Constants ──────────────────────────────────────────────────

const PIPELINE_FILTERS = [
  { value: "", label: "All Tasks" },
  { value: "text-generation", label: "Text Generation" },
  { value: "text2text-generation", label: "Text-to-Text" },
  { value: "text-classification", label: "Classification" },
  { value: "token-classification", label: "NER / Token" },
  { value: "question-answering", label: "QA" },
  { value: "summarization", label: "Summarization" },
  { value: "translation", label: "Translation" },
  { value: "fill-mask", label: "Fill Mask" },
  { value: "image-classification", label: "Image Classification" },
  { value: "object-detection", label: "Object Detection" },
  { value: "image-segmentation", label: "Segmentation" },
  { value: "automatic-speech-recognition", label: "Speech Recognition" },
  { value: "text-to-image", label: "Text-to-Image" },
  { value: "image-to-text", label: "Image Captioning" },
  { value: "feature-extraction", label: "Embeddings" },
  { value: "zero-shot-classification", label: "Zero-Shot" },
  { value: "sentence-similarity", label: "Similarity" },
];

const LIBRARY_FILTERS = [
  { value: "", label: "All Libraries" },
  { value: "transformers", label: "Transformers" },
  { value: "onnx", label: "ONNX" },
  { value: "diffusers", label: "Diffusers" },
  { value: "sentence-transformers", label: "Sentence Transformers" },
  { value: "timm", label: "timm" },
  { value: "safetensors", label: "Safetensors" },
];

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "downloads", label: "Most Downloads" },
  { value: "likes", label: "Most Likes" },
  { value: "modified", label: "Recently Updated" },
  { value: "created", label: "Newest" },
];

const MODEL_SEEDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-seeder`;

// ── Component ──────────────────────────────────────────────────

export default function HuggingFaceModelBrowser() {
  const [models, setModels] = useState<HFModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("");
  const [sortBy, setSortBy] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalFetched, setTotalFetched] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Seeding state
  const [seedingStates, setSeedingStates] = useState<Record<string, SeedingState>>({});
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showExpertLogs, setShowExpertLogs] = useState(false);
  const [globalLogs, setGlobalLogs] = useState<SeedLogEntry[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const addGlobalLog = useCallback((level: SeedLogEntry["level"], message: string) => {
    const entry: SeedLogEntry = {
      timestamp: new Date().toISOString().slice(11, 23),
      level,
      message,
    };
    setGlobalLogs((prev) => [...prev.slice(-500), entry]);
  }, []);

  // ── Fetch models from HuggingFace API ────────────────────────
  const fetchModels = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 0 : page;
    setIsLoading(true);
    setError(null);
    if (resetPage) {
      setPage(0);
      setModels([]);
      setTotalFetched(0);
    }

    addGlobalLog("info", `Fetching models from HuggingFace Hub (page ${currentPage}, query="${searchQuery}")…`);

    try {
      const params = new URLSearchParams({
        limit: "30",
        offset: String(currentPage * 30),
      });

      if (searchQuery) params.set("search", searchQuery);
      if (pipelineFilter) params.set("pipeline_tag", pipelineFilter);
      if (libraryFilter) params.set("library", libraryFilter);

      // Sort mapping
      const sortMap: Record<string, string> = {
        trending: "trending",
        downloads: "downloads",
        likes: "likes",
        modified: "lastModified",
        created: "createdAt",
      };
      params.set("sort", sortMap[sortBy] || "trending");
      params.set("direction", "-1");

      const url = `https://huggingface.co/api/models?${params}`;
      addGlobalLog("info", `GET ${url}`);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HuggingFace API returned ${res.status}`);

      const data: HFModel[] = await res.json();

      addGlobalLog("success", `Received ${data.length} models from HuggingFace`);

      if (resetPage) {
        setModels(data);
        setTotalFetched(data.length);
      } else {
        setModels((prev) => [...prev, ...data]);
        setTotalFetched((prev) => prev + data.length);
      }

      setHasMore(data.length === 30);

      // Log first few model names
      if (data.length > 0) {
        addGlobalLog("info", `  First: ${data.slice(0, 3).map(m => m.id).join(", ")}${data.length > 3 ? "…" : ""}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addGlobalLog("error", `Failed to fetch models: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, pipelineFilter, libraryFilter, sortBy, page, addGlobalLog]);

  // Initial load
  useEffect(() => {
    fetchModels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchModels(true);
    }, 500);
  }, [fetchModels]);

  const handleFilterApply = useCallback(() => {
    fetchModels(true);
  }, [fetchModels]);

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
    fetchModels(false);
  }, [fetchModels]);

  // ── Seed a model ────────────────────────────────────────────
  const seedModel = useCallback(async (modelId: string) => {
    addGlobalLog("info", `━━━ SEED: ${modelId} ━━━━━━━━━━━━━━━━━━`);

    // First, fetch model files from HF API
    addGlobalLog("info", `Fetching file listing from HuggingFace for ${modelId}…`);

    const filesUrl = `https://huggingface.co/api/models/${modelId}`;
    let modelFiles: string[] = [];

    try {
      const res = await fetch(filesUrl);
      if (!res.ok) throw new Error(`HF API ${res.status}`);
      const data = await res.json();

      // Extract file siblings
      const siblings: { rfilename: string }[] = data.siblings || [];
      modelFiles = siblings
        .map((s) => s.rfilename)
        .filter((f) =>
          f.endsWith(".json") ||
          f.endsWith(".onnx") ||
          f.endsWith(".safetensors") ||
          f.endsWith(".bin") ||
          f.endsWith(".txt") ||
          f.endsWith(".model") ||
          f.endsWith(".pb") ||
          f.endsWith(".msgpack")
        );

      addGlobalLog("success", `Found ${modelFiles.length} model files (${siblings.length} total in repo)`);
      modelFiles.forEach((f) => addGlobalLog("info", `  📄 ${f}`));
    } catch (e) {
      addGlobalLog("error", `Failed to list files: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    // Limit to config + small files for initial seed (< reasonable set)
    const configFiles = modelFiles.filter(
      (f) => f.endsWith(".json") || f.endsWith(".txt") || f.endsWith(".model")
    );
    const weightFiles = modelFiles.filter(
      (f) => f.endsWith(".onnx") || f.endsWith(".safetensors") || f.endsWith(".bin") || f.endsWith(".pb") || f.endsWith(".msgpack")
    );

    const filesToSeed = [...configFiles, ...weightFiles.slice(0, 3)]; // Config + first 3 weight files

    addGlobalLog("info", `Seeding ${filesToSeed.length} files (${configFiles.length} configs, ${Math.min(weightFiles.length, 3)} weights)…`);

    const seedState: SeedingState = {
      modelId,
      status: "seeding",
      files: filesToSeed.map((f) => ({ name: f, status: "pending" })),
      logs: [{ timestamp: new Date().toISOString().slice(11, 23), level: "info", message: `Starting seed for ${modelId}` }],
    };

    setSeedingStates((prev) => ({ ...prev, [modelId]: seedState }));
    setExpandedModel(modelId);

    // Seed each file through model-seeder
    for (let i = 0; i < filesToSeed.length; i++) {
      const file = filesToSeed[i];

      setSeedingStates((prev) => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          files: prev[modelId].files.map((f, idx) =>
            idx === i ? { ...f, status: "seeding" } : f
          ),
        },
      }));

      addGlobalLog("info", `  Seeding ${file}…`);

      const seedLog = (level: SeedLogEntry["level"], message: string) => {
        const entry: SeedLogEntry = {
          timestamp: new Date().toISOString().slice(11, 23),
          level,
          message,
        };
        setSeedingStates((prev) => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            logs: [...prev[modelId].logs, entry],
          },
        }));
        addGlobalLog(level, `    ${message}`);
      };

      try {
        const url = `${MODEL_SEEDER_URL}?file=${encodeURIComponent(file)}&model=${encodeURIComponent(modelId)}`;
        seedLog("info", `GET ${url}`);

        const startMs = performance.now();
        const res = await fetch(url, { redirect: "follow" });
        const elapsedMs = performance.now() - startMs;

        if (res.ok || res.status === 302 || res.status === 200) {
          const cacheHeader = res.headers.get("X-Model-Cache") || "unknown";
          seedLog("success", `✓ ${file} (${elapsedMs.toFixed(0)}ms, cache: ${cacheHeader})`);

          setSeedingStates((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              files: prev[modelId].files.map((f, idx) =>
                idx === i ? { ...f, status: "done" } : f
              ),
            },
          }));
        } else {
          const errText = await res.text().catch(() => "");
          seedLog("error", `✗ ${file}: HTTP ${res.status} — ${errText.slice(0, 200)}`);

          setSeedingStates((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              files: prev[modelId].files.map((f, idx) =>
                idx === i ? { ...f, status: "error" } : f
              ),
            },
          }));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        seedLog("error", `✗ ${file}: ${msg}`);

        setSeedingStates((prev) => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            files: prev[modelId].files.map((f, idx) =>
              idx === i ? { ...f, status: "error" } : f
            ),
          },
        }));
      }
    }

    // Mark complete
    const finalState = seedingStates[modelId];
    const anyError = filesToSeed.some((_, i) => {
      const s = seedingStates[modelId]?.files[i];
      return s?.status === "error";
    });

    setSeedingStates((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        status: anyError ? "error" : "done",
      },
    }));

    addGlobalLog(anyError ? "warn" : "success", `━━━ SEED ${anyError ? "PARTIAL" : "COMPLETE"}: ${modelId} ━━━`);
  }, [addGlobalLog, seedingStates]);

  // ── Render ──────────────────────────────────────────────────
  const formatNumber = (n?: number) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <IconBrain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              HuggingFace Model Hub
            </h2>
            <p className="text-xs text-muted-foreground">
              Browse {totalFetched > 0 ? `${totalFetched.toLocaleString()}+` : ""} models · One-click seed to local cache
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpertLogs(!showExpertLogs)}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showExpertLogs
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconTerminal2 className="w-3.5 h-3.5" />
            Expert Logs
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search models… (e.g. llama, whisper, stable-diffusion)"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`py-2 px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors border ${
              showFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconFilter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => fetchModels(true)}
            disabled={isLoading}
            className="py-2 px-3 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <IconRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 py-2">
                <select
                  value={pipelineFilter}
                  onChange={(e) => { setPipelineFilter(e.target.value); }}
                  className="py-1.5 px-2.5 rounded-lg bg-background border border-border text-foreground text-xs"
                >
                  {PIPELINE_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={libraryFilter}
                  onChange={(e) => { setLibraryFilter(e.target.value); }}
                  className="py-1.5 px-2.5 rounded-lg bg-background border border-border text-foreground text-xs"
                >
                  {LIBRARY_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); }}
                  className="py-1.5 px-2.5 rounded-lg bg-background border border-border text-foreground text-xs"
                >
                  {SORT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleFilterApply}
                  className="py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <IconAlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {models.map((model) => {
          const seedState = seedingStates[model.id];
          const isSeeding = seedState?.status === "seeding";
          const isSeeded = seedState?.status === "done";
          const isExpanded = expandedModel === model.id;

          return (
            <div
              key={model.id}
              className={`rounded-lg border transition-all ${
                isExpanded ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-border/80"
              }`}
            >
              {/* Model Card Header */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">{model.id.split("/").pop()}</h3>
                      <a
                        href={`https://huggingface.co/${model.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{model.id}</p>
                  </div>
                  {model.gated && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20 shrink-0">
                      Gated
                    </span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {model.pipeline_tag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {model.pipeline_tag}
                    </span>
                  )}
                  {model.library_name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {model.library_name}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconDownload className="w-3 h-3" />
                    {formatNumber(model.downloads)}
                  </span>
                  <span className="flex items-center gap-1">
                    <IconStar className="w-3 h-3" />
                    {formatNumber(model.likes)}
                  </span>
                  {model.lastModified && (
                    <span className="ml-auto text-[10px]">
                      {new Date(model.lastModified).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => seedModel(model.id)}
                    disabled={isSeeding}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      isSeeded
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                        : isSeeding
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isSeeding ? (
                      <><IconLoader2 className="w-3 h-3 animate-spin" /> Seeding…</>
                    ) : isSeeded ? (
                      <><IconCheck className="w-3 h-3" /> Seeded</>
                    ) : (
                      <><IconDownload className="w-3 h-3" /> Seed Model</>
                    )}
                  </button>
                  <button
                    onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                    className="py-1.5 px-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs"
                  >
                    {isExpanded ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details / Seed Progress */}
              <AnimatePresence>
                {isExpanded && seedState && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Seed Progress ({seedState.files.filter((f) => f.status === "done").length}/{seedState.files.length})
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {seedState.files.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            {f.status === "done" ? (
                              <IconCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : f.status === "seeding" ? (
                              <IconLoader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                            ) : f.status === "error" ? (
                              <IconAlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-border shrink-0" />
                            )}
                            <span className="font-mono text-muted-foreground truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Model-specific logs */}
                      <div className="mt-2">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Logs</div>
                        <div className="max-h-24 overflow-y-auto font-mono text-[10px] bg-muted/40 rounded p-1.5 space-y-0.5">
                          {seedState.logs.map((log, i) => (
                            <div
                              key={i}
                              className={
                                log.level === "success" ? "text-emerald-400"
                                  : log.level === "error" ? "text-destructive"
                                    : log.level === "warn" ? "text-amber-400"
                                      : "text-muted-foreground"
                              }
                            >
                              <span className="opacity-60">{log.timestamp}</span> {log.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Loading / Load More */}
      {isLoading && (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="w-4 h-4 animate-spin" />
          Loading models from HuggingFace…
        </div>
      )}

      {!isLoading && hasMore && models.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="py-2 px-6 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 flex items-center gap-2"
          >
            <IconTrendingUp className="w-4 h-4" />
            Load More Models
          </button>
        </div>
      )}

      {!isLoading && models.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No models found. Try a different search query or filter.
        </div>
      )}

      {/* Expert Logs Panel */}
      <AnimatePresence>
        {showExpertLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconTerminal2 className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expert Debug Log</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{globalLogs.length} entries</span>
                  <button
                    onClick={() => setGlobalLogs([])}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="h-48 overflow-y-auto font-mono text-[11px] bg-muted/30 rounded-lg p-2 space-y-0.5">
                {globalLogs.length === 0 ? (
                  <p className="opacity-50">Logs will appear here as you browse and seed models…</p>
                ) : (
                  globalLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.level === "success" ? "text-emerald-400"
                          : log.level === "error" ? "text-destructive"
                            : log.level === "warn" ? "text-amber-400"
                              : "text-muted-foreground"
                      }
                    >
                      <span className="opacity-50">{log.timestamp}</span>{" "}
                      {log.level === "success" ? "✓" : log.level === "error" ? "✗" : log.level === "warn" ? "⚠" : "›"}{" "}
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
