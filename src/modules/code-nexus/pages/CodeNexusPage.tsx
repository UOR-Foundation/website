/**
 * CodeNexusPage — Phase 2
 * ═══════════════════════
 *
 * Repository ingestion → graph store → queryable knowledge graph.
 * Sessions persist to hologram_sessions for cross-reload continuity.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { PageShell } from "@/modules/hologram-ui/components/PageShell";
import { GitBranch, Save, Database } from "lucide-react";
import { RepoInput } from "../components/RepoInput";
import { IngestionResults } from "../components/IngestionResults";
import { GraphQueryPanel } from "../components/GraphQueryPanel";
import { ingestFromGitHub, ingestFromZip } from "../lib/ingestion";
import { mapToUor } from "../lib/uor-mapper";
import { CodeGraphStore } from "../lib/graph-store";
import { dehydrateSession, listSessions, rehydrateSession } from "../lib/session-persistence";
import type { IngestionResult } from "../lib/ingestion";
import type { UorMappingResult } from "../lib/uor-mapper";
import type { SessionRecord } from "../lib/session-persistence";
import { supabase } from "@/integrations/supabase/client";

export default function CodeNexusPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [ingestion, setIngestion] = useState<IngestionResult | null>(null);
  const [mapping, setMapping] = useState<UorMappingResult | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const graphStore = useMemo(() => new CodeGraphStore(), []);

  // Check auth + load sessions
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        listSessions(data.user.id).then(setSessions).catch(() => {});
      }
    });
  }, []);

  const populateGraph = useCallback(
    (ing: IngestionResult, map: UorMappingResult) => {
      graphStore.populate(ing, map);
      setIngestion(ing);
      setMapping(map);
      setRepoName(ing.repoName);
    },
    [graphStore]
  );

  const runPipeline = useCallback(
    async (ingestionResult: IngestionResult) => {
      setProgress("Mapping to UOR identities…");
      const uorResult = await mapToUor(ingestionResult, setProgress);
      setProgress("Building graph…");
      populateGraph(ingestionResult, uorResult);
      setProgress(null);
    },
    [populateGraph]
  );

  const handleUrl = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setError(null);
      setIngestion(null);
      setMapping(null);
      try {
        const result = await ingestFromGitHub(url, setProgress);
        await runPipeline(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ingestion failed");
      } finally {
        setIsLoading(false);
      }
    },
    [runPipeline]
  );

  const handleZip = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setIngestion(null);
      setMapping(null);
      try {
        const result = await ingestFromZip(file, setProgress);
        await runPipeline(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ingestion failed");
      } finally {
        setIsLoading(false);
      }
    },
    [runPipeline]
  );

  const handleSave = async () => {
    if (!userId || !repoName || graphStore.entityCount() === 0) return;
    setIsSaving(true);
    try {
      await dehydrateSession(graphStore, repoName, userId);
      const updated = await listSessions(userId);
      setSessions(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSession = async (sessionCid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { repoName: name } = await rehydrateSession(graphStore, sessionCid);
      setRepoName(name);
      // Build a synthetic ingestion view from the store
      setIngestion({
        repoName: name,
        files: [],
        entities: Array.from(graphStore.nodes.values()).map((n) => ({
          name: n.id,
          type: n.type as any,
          hash: n.cid,
          line: n.line,
          content: "",
        })),
        relations: graphStore.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type as any,
        })),
        analyses: new Map(),
        totalLines: 0,
      });
      setMapping(null); // no mapping for rehydrated sessions
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIngestion(null);
    setMapping(null);
    setRepoName(null);
    setError(null);
    setProgress(null);
  };

  const hasGraph = graphStore.entityCount() > 0;

  return (
    <PageShell
      title="Code Nexus"
      subtitle="Holographic Lens · Isometry"
      icon={<GitBranch size={16} />}
      backTo="/"
      badge="Phase 2"
      actions={
        <div className="flex items-center gap-2">
          {hasGraph && userId && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              <Save size={12} />
              {isSaving ? "Saving…" : "Dehydrate"}
            </button>
          )}
          {ingestion && (
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              New Analysis
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center py-8 gap-8">
        {/* Header (shown when no results) */}
        {!ingestion && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/8 border border-border">
              <GitBranch className="w-7 h-7 text-primary" strokeWidth={1.2} />
            </div>
            <div className="text-center space-y-1.5 max-w-md">
              <h2
                className="text-xl font-light text-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Code Nexus
              </h2>
              <p
                className="text-sm text-muted-foreground leading-relaxed"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}
              >
                Transform any repository into a queryable UOR knowledge graph.
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {isLoading && progress && (
          <p className="text-xs text-primary animate-pulse" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {progress}
          </p>
        )}

        {/* Input or Results */}
        {!ingestion ? (
          <div className="w-full space-y-8">
            <RepoInput onSubmitUrl={handleUrl} onSubmitZip={handleZip} isLoading={isLoading} error={error} />

            {/* Saved sessions */}
            {sessions.length > 0 && (
              <div className="max-w-lg mx-auto space-y-2">
                <h4
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Saved Sessions
                </h4>
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSession(s.sessionCid)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Database size={12} className="text-primary" />
                        <span className="text-xs text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                          {s.label.replace("Code Nexus: ", "")}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.nodeCount} nodes · {s.edgeCount} edges
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-8">
            <IngestionResults ingestion={ingestion} mapping={mapping} />

            {/* Graph Query Panel */}
            {hasGraph && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-px flex-1 bg-border" />
                  <span
                    className="text-[10px] text-muted-foreground uppercase tracking-widest"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    Graph Explorer
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <GraphQueryPanel store={graphStore} />
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
