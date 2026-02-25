/**
 * Blueprint Library Panel — Save, Load, and Share Lens Blueprints
 * ═══════════════════════════════════════════════════════════════
 *
 * The library panel for the Lens Inspector. Displays saved blueprints
 * with their UOR addresses, allows loading into the inspector, and
 * provides the Memory Crisis lens as a built-in example.
 *
 * @module lens-inspector/components/BlueprintLibrary
 */

import { useState, useCallback } from "react";
import {
  IconDatabase, IconDownload, IconTrash, IconCopy, IconCheck,
  IconBrain, IconShield, IconPlus, IconChevronDown, IconChevronUp,
} from "@tabler/icons-react";
import {
  useLensBlueprints,
  useSaveBlueprint,
  useDeleteBlueprint,
  type StoredBlueprint,
} from "../hooks/use-lens-blueprints";
import type { LensBlueprint } from "@/modules/uns/core/hologram/lens-blueprint";
import { MEMORY_CRISIS_BLUEPRINT } from "@/modules/uns/core/hologram/lenses/memory-crisis";
import { PROMPT_INJECTION_SHIELD_BLUEPRINT } from "@/modules/uns/core/hologram/lenses/prompt-injection-shield";

// ── Copy button ────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <IconCheck size={12} className="text-primary" /> : <IconCopy size={12} />}
    </button>
  );
}

// ── Blueprint Card ─────────────────────────────────────────────────────────

function BlueprintCard({
  stored,
  onLoad,
  onDelete,
  isBuiltIn,
  builtInBlueprint,
  icon,
}: {
  stored?: StoredBlueprint;
  onLoad: (bp: LensBlueprint) => void;
  onDelete?: (id: string) => void;
  isBuiltIn?: boolean;
  builtInBlueprint?: LensBlueprint;
  icon?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const bp = stored?.blueprint ?? builtInBlueprint ?? MEMORY_CRISIS_BLUEPRINT;

  return (
    <div className="border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
      <div className="px-3 py-2.5 flex items-start gap-2">
        {icon ?? <IconBrain size={14} className="text-primary mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground truncate">
              {bp.name}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">
              v{bp.version}
            </span>
            {isBuiltIn && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                BUILT-IN
              </span>
            )}
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
              bp.morphism === "isometry"
                ? "bg-primary/10 text-primary"
                : bp.morphism === "embedding"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-muted text-muted-foreground"
            }`}>
              {bp.morphism}
            </span>
          </div>
          {bp.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
              {bp.description}
            </p>
          )}
          {stored && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[200px]">
                {stored.uor_cid.slice(0, 24)}…
              </span>
              <CopyBtn text={stored.uor_cid} />
            </div>
          )}
          {bp.tags && bp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {bp.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
            title="Details"
          >
            {expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          </button>
          <button
            onClick={() => onLoad(bp)}
            className="p-1 rounded hover:bg-primary/10 transition-colors text-primary"
            title="Load into inspector"
          >
            <IconDownload size={12} />
          </button>
          {onDelete && stored && (
            <button
              onClick={() => onDelete(stored.id)}
              className="p-1 rounded hover:bg-destructive/10 transition-colors text-destructive"
              title="Delete"
            >
              <IconTrash size={12} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 py-2 bg-secondary/30">
          {bp.problem && (
            <div className="mb-2">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase">Problem</span>
              <p className="text-[10px] text-foreground mt-0.5">{bp.problem}</p>
            </div>
          )}
          <span className="text-[9px] font-semibold text-muted-foreground uppercase">
            Pipeline ({bp.elements.length} elements)
          </span>
          <div className="mt-1 space-y-1">
            {bp.elements.map((el, i) => (
              <div key={el.id} className="flex items-start gap-2">
                <span className="text-[9px] font-mono text-primary w-4 shrink-0 text-right">
                  {i + 1}.
                </span>
                <div>
                  <span className="text-[10px] font-mono font-medium text-foreground">
                    {el.id}
                  </span>
                  <span className="text-[9px] text-muted-foreground ml-1">
                    ({el.kind})
                  </span>
                  {el.description && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {el.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(bp, null, 2));
              }}
              className="text-[9px] font-mono text-primary hover:underline"
            >
              Copy Blueprint JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Library Panel ─────────────────────────────────────────────────────

interface BlueprintLibraryProps {
  onLoadBlueprint: (bp: LensBlueprint) => void;
  currentBlueprint?: LensBlueprint | null;
}

export default function BlueprintLibrary({
  onLoadBlueprint,
  currentBlueprint,
}: BlueprintLibraryProps) {
  const { data: saved, isLoading } = useLensBlueprints();
  const saveBlueprint = useSaveBlueprint();
  const deleteBlueprint = useDeleteBlueprint();

  const handleSaveCurrent = useCallback(() => {
    if (!currentBlueprint) return;
    saveBlueprint.mutate(currentBlueprint);
  }, [currentBlueprint, saveBlueprint]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center gap-2">
        <IconDatabase size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">Lens Library</span>
        <span className="text-[9px] font-mono text-muted-foreground ml-1">
          content-addressed • shareable • composable
        </span>
        {currentBlueprint && (
          <button
            onClick={handleSaveCurrent}
            disabled={saveBlueprint.isPending}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <IconPlus size={10} />
            {saveBlueprint.isPending ? "Saving…" : "Save Current"}
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {/* Built-in: Memory Crisis */}
        <BlueprintCard
          onLoad={onLoadBlueprint}
          isBuiltIn
          builtInBlueprint={MEMORY_CRISIS_BLUEPRINT}
          icon={<IconBrain size={14} className="text-primary mt-0.5 shrink-0" />}
        />

        {/* Built-in: Prompt Injection Shield */}
        <BlueprintCard
          onLoad={onLoadBlueprint}
          isBuiltIn
          builtInBlueprint={PROMPT_INJECTION_SHIELD_BLUEPRINT}
          icon={<IconShield size={14} className="text-amber-500 mt-0.5 shrink-0" />}
        />

        {/* Saved blueprints */}
        {isLoading && (
          <p className="text-[10px] text-muted-foreground italic py-2 text-center">
            Loading saved blueprints…
          </p>
        )}
        {saved && saved.length > 0 && (
          <>
            <div className="border-t border-border pt-2 mt-2">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                Saved ({saved.length})
              </span>
            </div>
            {saved.map((s) => (
              <BlueprintCard
                key={s.id}
                stored={s}
                onLoad={onLoadBlueprint}
                onDelete={(id) => deleteBlueprint.mutate(id)}
              />
            ))}
          </>
        )}
        {saved && saved.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic py-2 text-center">
            No saved blueprints yet. Compose a lens and save it.
          </p>
        )}
      </div>
    </div>
  );
}
