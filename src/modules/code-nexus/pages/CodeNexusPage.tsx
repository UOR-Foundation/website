/**
 * CodeNexusPage — Phase 1
 * ═══════════════════════
 *
 * Repository ingestion with GitHub URL or ZIP input.
 * Parses source files, extracts entities/relations,
 * and maps them to UOR-compliant identities.
 */

import { useState, useCallback } from "react";
import { PageShell } from "@/modules/hologram-ui/components/PageShell";
import { GitBranch } from "lucide-react";
import { RepoInput } from "../components/RepoInput";
import { IngestionResults } from "../components/IngestionResults";
import { ingestFromGitHub, ingestFromZip } from "../lib/ingestion";
import { mapToUor } from "../lib/uor-mapper";
import type { IngestionResult } from "../lib/ingestion";
import type { UorMappingResult } from "../lib/uor-mapper";

export default function CodeNexusPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [ingestion, setIngestion] = useState<IngestionResult | null>(null);
  const [mapping, setMapping] = useState<UorMappingResult | null>(null);

  const runPipeline = useCallback(async (ingestionResult: IngestionResult) => {
    setProgress("Mapping to UOR identities…");
    const uorResult = await mapToUor(ingestionResult, setProgress);
    setIngestion(ingestionResult);
    setMapping(uorResult);
    setProgress(null);
  }, []);

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

  const handleReset = () => {
    setIngestion(null);
    setMapping(null);
    setError(null);
    setProgress(null);
  };

  return (
    <PageShell
      title="Code Nexus"
      subtitle="Holographic Lens · Isometry"
      icon={<GitBranch size={16} />}
      backTo="/"
      badge="Phase 1"
      actions={
        ingestion ? (
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            New Analysis
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center justify-center py-16 gap-8">
        {/* Icon + title (shown when no results) */}
        {!ingestion && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/8 border border-border"
            >
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
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 300,
                }}
              >
                Transform any repository into a UOR knowledge graph.
              </p>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {isLoading && progress && (
          <p
            className="text-xs text-primary animate-pulse"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            {progress}
          </p>
        )}

        {/* Input or Results */}
        {!ingestion ? (
          <RepoInput
            onSubmitUrl={handleUrl}
            onSubmitZip={handleZip}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <IngestionResults ingestion={ingestion} mapping={mapping} />
        )}
      </div>
    </PageShell>
  );
}
