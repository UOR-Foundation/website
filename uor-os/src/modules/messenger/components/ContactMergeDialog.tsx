/**
 * ContactMergeDialog — Identity resolution UI for merging duplicate contacts.
 *
 * Shows suggested merges and allows manual merge/split operations:
 * "Alice on WhatsApp appears to be alice@email.com — merge?"
 */

import { useState, useEffect, useCallback } from "react";
import { X, Merge, Scissors, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import PlatformBadge from "./PlatformBadge";
import {
  findMergeSuggestions,
  mergeContacts,
  type MergeSuggestion,
  type Contact,
} from "../lib/identity-resolver";
import type { BridgePlatform } from "../lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ContactMergeDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const results = await findMergeSuggestions(user.id);
    setSuggestions(results);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) loadSuggestions();
  }, [open, loadSuggestions]);

  const handleMerge = async (suggestion: MergeSuggestion) => {
    if (!user) return;
    const pairKey = `${suggestion.contactA.id}:${suggestion.contactB.id}`;
    setMerging(pairKey);

    const success = await mergeContacts(user.id, suggestion.contactA.id, suggestion.contactB.id);
    if (success) {
      toast.success(`Merged ${suggestion.contactA.displayName} and ${suggestion.contactB.displayName}`);
      setSuggestions((prev) =>
        prev.filter(
          (s) =>
            !(s.contactA.id === suggestion.contactA.id && s.contactB.id === suggestion.contactB.id),
        ),
      );
    } else {
      toast.error("Failed to merge contacts");
    }
    setMerging(null);
  };

  const handleDismiss = (suggestion: MergeSuggestion) => {
    setSuggestions((prev) =>
      prev.filter(
        (s) =>
          !(s.contactA.id === suggestion.contactA.id && s.contactB.id === suggestion.contactB.id),
      ),
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-slate-900 border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <div>
            <h2 className="text-base font-semibold text-white/85">Identity Resolution</h2>
            <p className="text-[12px] text-white/35 mt-0.5">
              Merge duplicate contacts across platforms
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Check size={32} className="mx-auto text-teal-400/30 mb-3" />
              <p className="text-sm text-white/40">All contacts are resolved</p>
              <p className="text-[12px] text-white/25 mt-1">
                No duplicate contacts detected across your platforms
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const pairKey = `${suggestion.contactA.id}:${suggestion.contactB.id}`;
                return (
                  <div
                    key={pairKey}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4"
                  >
                    {/* Match reason */}
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={12} className="text-amber-400/50" />
                      <span className="text-[11px] text-amber-400/60">{suggestion.reason}</span>
                      <span className="text-[10px] text-white/20 ml-auto">
                        {Math.round(suggestion.confidence * 100)}% match
                      </span>
                    </div>

                    {/* Contact cards */}
                    <div className="flex items-center gap-3">
                      <ContactCard contact={suggestion.contactA} />
                      <Merge size={16} className="text-white/15 flex-shrink-0" />
                      <ContactCard contact={suggestion.contactB} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => handleDismiss(suggestion)}
                        className="px-3 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                      >
                        Not the same
                      </button>
                      <button
                        onClick={() => handleMerge(suggestion)}
                        disabled={merging === pairKey}
                        className="px-3 py-1.5 rounded-lg text-[11px] bg-teal-500/15 text-teal-400/70 hover:bg-teal-500/25 hover:text-teal-400 transition-colors disabled:opacity-50"
                      >
                        {merging === pairKey ? "Merging…" : "Merge"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="flex-1 rounded-lg bg-white/[0.02] border border-white/[0.03] p-2.5">
      <p className="text-sm text-white/70 font-medium truncate">{contact.displayName}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {contact.mergedIdentities.map((id) => (
          <PlatformBadge
            key={`${id.platform}-${id.platformUserId}`}
            platform={id.platform as BridgePlatform}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
