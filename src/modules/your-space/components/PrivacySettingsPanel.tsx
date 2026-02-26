/**
 * Privacy Settings Panel — Your Secure Citadel
 *
 * Interactive panel for configuring selective disclosure rules
 * and generating a programmatic privacy policy.
 * Lives inside Your Space as the privacy command centre.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck, Eye, EyeOff, Clock, Lock, Unlock,
  ChevronDown, ChevronUp, FileText, Download,
  ToggleLeft, ToggleRight, Info, AlertTriangle, Check,
  CloudOff, Cloud, Loader2, GitCompareArrows, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface DataCategoryRule {
  id: string;
  label: string;
  description: string;
  icon: string;
  disclosed: boolean;
  retention: RetentionOption;
  allowedPurposes: string[];
}

type RetentionOption = "session" | "30days" | "90days" | "1year" | "lifetime" | "never";

const RETENTION_LABELS: Record<RetentionOption, string> = {
  never: "Never store",
  session: "Session only",
  "30days": "30 days",
  "90days": "90 days",
  "1year": "1 year",
  lifetime: "Account lifetime",
};

const PURPOSES = [
  { id: "core", label: "Core Service", description: "Required for the service to function" },
  { id: "analytics", label: "Analytics", description: "Anonymised usage analysis" },
  { id: "personalization", label: "Personalisation", description: "Tailoring experience to you" },
  { id: "marketing", label: "Marketing", description: "Promotional communications" },
  { id: "thirdparty", label: "Third-Party Sharing", description: "Sharing with external parties" },
  { id: "ai", label: "AI Training", description: "Training machine learning models" },
];

const DEFAULT_CATEGORIES: DataCategoryRule[] = [
  { id: "identity", label: "Identity", description: "Name, email, identifiers", icon: "🪪", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "contact", label: "Contact", description: "Phone, address, social handles", icon: "📇", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "behavioral", label: "Behavioural", description: "Clicks, navigation, usage patterns", icon: "📊", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "transaction", label: "Transaction", description: "Purchases, payments, invoices", icon: "💳", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "location", label: "Location", description: "GPS, IP-based location", icon: "📍", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "biometric", label: "Biometric", description: "Fingerprints, face, voice", icon: "🧬", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "health", label: "Health", description: "Medical records, fitness data", icon: "🏥", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "financial", label: "Financial", description: "Bank accounts, credit scores", icon: "🏦", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "communication", label: "Communication", description: "Messages, emails, call logs", icon: "💬", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "device", label: "Device", description: "Hardware IDs, OS, browser info", icon: "💻", disclosed: false, retention: "never", allowedPurposes: [] },
  { id: "content", label: "Content", description: "User-generated content, uploads", icon: "📄", disclosed: false, retention: "never", allowedPurposes: [] },
];

const STORAGE_KEY = "polygram-privacy-rules";

function loadRules(): DataCategoryRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}

function saveRules(rules: DataCategoryRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function PrivacyMeter({ rules }: { rules: DataCategoryRule[] }) {
  const disclosedCount = rules.filter(r => r.disclosed).length;
  const total = rules.length;
  const score = total > 0 ? Math.round(((total - disclosedCount) / total) * 100) : 100;

  const color = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const bgColor = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const label = score >= 80 ? "Maximum Privacy" : score >= 50 ? "Moderate Disclosure" : "High Disclosure";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-muted/30"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${score}, 100`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold font-body ${color}`}>
          {score}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-body text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground text-xs font-body">
          {disclosedCount === 0
            ? "No data categories disclosed — full privacy."
            : `${disclosedCount} of ${total} categories selectively disclosed.`}
        </p>
      </div>
      <div className={`w-2.5 h-2.5 rounded-full ${bgColor} shrink-0 animate-pulse`} />
    </div>
  );
}

function CategoryRow({
  rule,
  onToggle,
  onRetention,
  onPurposeToggle,
}: {
  rule: DataCategoryRule;
  onToggle: () => void;
  onRetention: (r: RetentionOption) => void;
  onPurposeToggle: (purposeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all bg-card">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="text-lg shrink-0">{rule.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-body text-sm font-semibold">{rule.label}</p>
          <p className="text-muted-foreground text-xs font-body truncate">{rule.description}</p>
        </div>

        {/* Disclosure toggle */}
        <button
          onClick={onToggle}
          className="shrink-0 transition-colors cursor-pointer"
          title={rule.disclosed ? "Revoke disclosure" : "Allow selective disclosure"}
        >
          {rule.disclosed ? (
            <ToggleRight className="w-7 h-7 text-amber-500" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-emerald-500" />
          )}
        </button>

        {/* Status badge */}
        <span className={`shrink-0 text-[10px] font-body font-semibold px-2 py-0.5 rounded-full ${
          rule.disclosed
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        }`}>
          {rule.disclosed ? "DISCLOSED" : "PRIVATE"}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded config */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
              {/* Retention */}
              <div>
                <label className="text-xs font-body text-muted-foreground font-medium flex items-center gap-1.5 mb-2">
                  <Clock size={12} /> Retention Limit
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(RETENTION_LABELS) as [RetentionOption, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => onRetention(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-body font-medium transition-all cursor-pointer border ${
                        rule.retention === key
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed purposes */}
              <div>
                <label className="text-xs font-body text-muted-foreground font-medium flex items-center gap-1.5 mb-2">
                  <Info size={12} /> Allowed Purposes
                  {!rule.disclosed && (
                    <span className="text-emerald-500 ml-1">(none — data is private)</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PURPOSES.map(p => {
                    const active = rule.allowedPurposes.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onPurposeToggle(p.id)}
                        disabled={!rule.disclosed}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-body transition-all cursor-pointer border text-left ${
                          !rule.disclosed
                            ? "opacity-40 cursor-not-allowed border-transparent bg-muted/30"
                            : active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                        }`}
                        title={p.description}
                      >
                        {active ? <Check size={12} className="shrink-0" /> : <div className="w-3 h-3 rounded border border-muted-foreground/30 shrink-0" />}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface PrivacySettingsPanelProps {
  isDark?: boolean;
}

export const PrivacySettingsPanel = ({ isDark }: PrivacySettingsPanelProps) => {
  const [rules, setRules] = useState<DataCategoryRule[]>(loadRules);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [saved, setSaved] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastSavedRules, setLastSavedRules] = useState<DataCategoryRule[]>(loadRules);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB on mount if authenticated
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("privacy_rules")
        .eq("user_id", user.id)
        .single();
      if (!cancelled && data?.privacy_rules) {
        const dbRules = data.privacy_rules as unknown as DataCategoryRule[];
        // Merge with defaults to pick up any new categories
        const merged = DEFAULT_CATEGORIES.map(def => {
          const stored = dbRules.find((r: DataCategoryRule) => r.id === def.id);
          return stored ? { ...def, ...stored } : def;
        });
        setRules(merged);
        setLastSavedRules(merged);
        saveRules(merged); // sync localStorage too
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Debounced save to DB
  const persistToDB = useCallback((nextRules: DataCategoryRule[]) => {
    saveRules(nextRules); // always save localStorage immediately
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaved(false);
    debounceRef.current = setTimeout(async () => {
      setSyncing(true);
      await supabase
        .from("profiles")
        .update({ privacy_rules: nextRules as any })
        .eq("user_id", userId);
      setSyncing(false);
      setSaved(true);
      setLastSavedRules(nextRules);
    }, 800);
  }, [userId]);

  const updateRule = useCallback((id: string, patch: Partial<DataCategoryRule>) => {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r);
      persistToDB(next);
      return next;
    });
  }, [persistToDB]);

  const toggleDisclosure = useCallback((id: string) => {
    setRules(prev => {
      const next = prev.map(r =>
        r.id === id
          ? { ...r, disclosed: !r.disclosed, allowedPurposes: !r.disclosed ? r.allowedPurposes : [] }
          : r
      );
      persistToDB(next);
      return next;
    });
  }, [persistToDB]);

  const togglePurpose = useCallback((catId: string, purposeId: string) => {
    setRules(prev => {
      const next = prev.map(r => {
        if (r.id !== catId) return r;
        const has = r.allowedPurposes.includes(purposeId);
        return {
          ...r,
          allowedPurposes: has
            ? r.allowedPurposes.filter(p => p !== purposeId)
            : [...r.allowedPurposes, purposeId],
        };
      });
      persistToDB(next);
      return next;
    });
  }, [persistToDB]);

  const blockAll = useCallback(() => {
    const next = rules.map(r => ({ ...r, disclosed: false, allowedPurposes: [], retention: "never" as RetentionOption }));
    setRules(next);
    persistToDB(next);
  }, [rules, persistToDB]);

  // Generate policy JSON
  const policyDocument = useMemo(() => {
    const now = new Date().toISOString();
    return {
      "@context": "https://polygram.me/privacy/v1",
      "@type": "privacy:PersonalPolicy",
      version: "1.0.0",
      generatedAt: now,
      defaultStance: "deny-all",
      categories: rules.map(r => ({
        category: r.id,
        label: r.label,
        disclosed: r.disclosed,
        retention: r.retention,
        allowedPurposes: r.allowedPurposes,
      })),
      enforcement: {
        onViolation: ["revoke-access", "notify-owner"],
        gracePeriodDays: 0,
        auditTrailRequired: true,
      },
    };
  }, [rules]);

  const downloadPolicy = useCallback(() => {
    const blob = new Blob([JSON.stringify(policyDocument, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-privacy-policy.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [policyDocument]);

  // ── Diff computation ──────────────────────────────────────────────
  const diffs = useMemo(() => {
    const changes: Array<{
      category: string;
      icon: string;
      field: string;
      from: string;
      to: string;
      type: "added" | "removed" | "changed";
    }> = [];

    for (const rule of rules) {
      const prev = lastSavedRules.find(r => r.id === rule.id);
      if (!prev) continue;

      if (prev.disclosed !== rule.disclosed) {
        changes.push({
          category: rule.label, icon: rule.icon, field: "Disclosure",
          from: prev.disclosed ? "Disclosed" : "Private",
          to: rule.disclosed ? "Disclosed" : "Private",
          type: rule.disclosed ? "added" : "removed",
        });
      }
      if (prev.retention !== rule.retention) {
        changes.push({
          category: rule.label, icon: rule.icon, field: "Retention",
          from: RETENTION_LABELS[prev.retention],
          to: RETENTION_LABELS[rule.retention],
          type: "changed",
        });
      }
      const addedPurposes = rule.allowedPurposes.filter(p => !prev.allowedPurposes.includes(p));
      const removedPurposes = prev.allowedPurposes.filter(p => !rule.allowedPurposes.includes(p));
      for (const p of addedPurposes) {
        const label = PURPOSES.find(x => x.id === p)?.label ?? p;
        changes.push({ category: rule.label, icon: rule.icon, field: "Purpose", from: "—", to: label, type: "added" });
      }
      for (const p of removedPurposes) {
        const label = PURPOSES.find(x => x.id === p)?.label ?? p;
        changes.push({ category: rule.label, icon: rule.icon, field: "Purpose", from: label, to: "—", type: "removed" });
      }
    }
    return changes;
  }, [rules, lastSavedRules]);

  const hasChanges = diffs.length > 0;
  const disclosedCount = rules.filter(r => r.disclosed).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-foreground font-body text-base font-semibold">Privacy Settings</h3>
          <p className="text-muted-foreground text-xs font-body mt-0.5">
            Everything is private by default. Selectively disclose what you choose, to whom, and for how long.
          </p>
        </div>
        {/* Sync status */}
        <div className="shrink-0 mt-1">
          {syncing ? (
            <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
              <Loader2 size={10} className="animate-spin" /> Saving…
            </span>
          ) : userId ? (
            <span className="flex items-center gap-1 text-[10px] font-body text-emerald-500">
              <Cloud size={10} /> {saved ? "Synced" : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground" title="Sign in to sync across devices">
              <CloudOff size={10} /> Local only
            </span>
          )}
        </div>
      </div>

      {/* Privacy Meter */}
      <PrivacyMeter rules={rules} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={blockAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all cursor-pointer"
        >
          <Lock size={12} /> Block Everything
        </button>
        <button
          onClick={() => setShowPolicy(!showPolicy)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-all cursor-pointer"
        >
          <FileText size={12} /> {showPolicy ? "Hide Policy" : "View My Policy"}
        </button>
        {hasChanges && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium border transition-all cursor-pointer ${
              showDiff
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
            }`}
          >
            <GitCompareArrows size={12} />
            {diffs.length} {diffs.length === 1 ? "Change" : "Changes"}
          </button>
        )}
        {showPolicy && (
          <button
            onClick={downloadPolicy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all cursor-pointer"
          >
            <Download size={12} /> Export JSON
          </button>
        )}
      </div>

      {/* ── Changes Diff Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {showDiff && hasChanges && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <GitCompareArrows size={14} className="text-amber-500" />
                <span className="text-foreground font-body text-sm font-semibold">Unsaved Changes</span>
                <span className="text-[10px] font-body text-muted-foreground ml-auto">
                  {diffs.length} {diffs.length === 1 ? "change" : "changes"} pending
                </span>
              </div>
              {diffs.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card/60 border border-border text-xs font-body animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <span className="text-sm">{d.icon}</span>
                  <span className="text-foreground font-medium min-w-[70px]">{d.category}</span>
                  <span className="text-muted-foreground">{d.field}</span>
                  <span className={`ml-auto flex items-center gap-1.5 ${
                    d.type === "removed" ? "text-red-400" : d.type === "added" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    <span className={`line-through opacity-60 ${d.type === "removed" ? "text-red-400" : "text-muted-foreground"}`}>
                      {d.from}
                    </span>
                    <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                    <span className={d.type === "added" ? "text-emerald-400 font-medium" : d.type === "removed" ? "text-red-400 font-medium" : "text-foreground font-medium"}>
                      {d.to}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Policy Preview */}
      <AnimatePresence>
        {showPolicy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-primary" />
                <span className="text-foreground font-body text-sm font-semibold">Your Machine-Readable Privacy Policy</span>
              </div>
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                {JSON.stringify(policyDocument, null, 2)}
              </pre>
              <p className="text-xs font-body text-muted-foreground mt-3 flex items-center gap-1.5">
                <Info size={11} />
                Applications must accept this policy before accessing any of your data.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclosure notice */}
      {disclosedCount > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs font-body text-amber-700 dark:text-amber-400">
            You have <strong>{disclosedCount}</strong> {disclosedCount === 1 ? "category" : "categories"} selectively disclosed.
            Each disclosure is a deliberate choice — you can revoke at any time.
          </p>
        </div>
      )}

      {/* Data Category Rules */}
      <div className="space-y-2">
        <p className="text-xs font-body text-muted-foreground font-medium uppercase tracking-wider mb-3">
          Data Categories
        </p>
        {rules.map(rule => (
          <CategoryRow
            key={rule.id}
            rule={rule}
            onToggle={() => toggleDisclosure(rule.id)}
            onRetention={(r) => updateRule(rule.id, { retention: r })}
            onPurposeToggle={(p) => togglePurpose(rule.id, p)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-body text-muted-foreground text-center">
          Privacy is the default. Every disclosure requires your explicit, reversible consent.
        </p>
      </div>
    </div>
  );
};