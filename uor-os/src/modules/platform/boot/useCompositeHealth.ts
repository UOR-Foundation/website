/**
 * useCompositeHealth — Single aggregate health score for the entire system.
 *
 * Combines boot seal status, audit stats (receipts, derivations, certificates,
 * traces), and error budget into one 0-100 score with a derived color.
 *
 * @module boot/useCompositeHealth
 */

import { useState, useEffect, useMemo } from "react";
import { useBootStatus } from "./useBootStatus";
import { getErrorBudget } from "./seal-error-budget";
import { supabase } from "@/integrations/supabase/client";

export interface AuditStats {
  receipts: number;
  receiptPassRate: number;
  derivations: number;
  gradeARate: number;
  certificates: number;
  certValidRate: number;
  traces: number;
  loading: boolean;
}

export interface CompositeHealth {
  /** 0–100 aggregate score */
  score: number;
  /** Semantic label */
  label: string;
  /** CSS-safe hex color */
  color: string;
  /** Whether the dot should pulse */
  pulse: boolean;
  /** Individual signal breakdown */
  signals: {
    sealStatus: string;
    sealWeight: number;
    errorBudget: number;
    auditHealth: number;
  };
  /** Audit statistics for display */
  audit: AuditStats;
  /** Boot status pass-through */
  bootStatus: ReturnType<typeof useBootStatus>;
}

const COLORS = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  gray: "#6b7280",
};

/**
 * Scoring weights:
 *   - Seal status:   50% (the system's cryptographic integrity)
 *   - Error budget:  25% (rolling verification success rate)
 *   - Audit health:  25% (receipt/derivation/cert pass rates)
 */
function computeScore(
  sealStatus: string,
  errorBudget: { successRate: number; total: number },
  audit: AuditStats,
): { score: number; label: string; color: string; pulse: boolean; signals: CompositeHealth["signals"] } {
  // Seal: 0 or 100
  const sealScore =
    sealStatus === "sealed" ? 100 :
    sealStatus === "degraded" ? 60 :
    sealStatus === "booting" ? 50 :
    0; // unsealed, broken, failed

  // Error budget: direct percentage (default 100 if no data)
  const ebScore = errorBudget.total > 0 ? errorBudget.successRate : 100;

  // Audit health: average of available pass rates (fallback 100 when no data)
  const auditRates: number[] = [];
  if (audit.receipts > 0) auditRates.push(audit.receiptPassRate);
  if (audit.derivations > 0) auditRates.push(audit.gradeARate);
  if (audit.certificates > 0) auditRates.push(audit.certValidRate);
  const auditScore = auditRates.length > 0
    ? auditRates.reduce((a, b) => a + b, 0) / auditRates.length
    : 100; // clean state = healthy

  const score = Math.round(sealScore * 0.5 + ebScore * 0.25 + auditScore * 0.25);

  // Derive label + color
  let label: string;
  let color: string;
  let pulse: boolean;
  if (sealStatus === "booting") {
    label = "Starting";
    color = COLORS.gray;
    pulse = true;
  } else if (score >= 90) {
    label = "Healthy";
    color = COLORS.green;
    pulse = false;
  } else if (score >= 60) {
    label = "Degraded";
    color = COLORS.yellow;
    pulse = true;
  } else {
    label = "Critical";
    color = COLORS.red;
    pulse = true;
  }

  return {
    score,
    label,
    color,
    pulse,
    signals: {
      sealStatus,
      sealWeight: sealScore,
      errorBudget: ebScore,
      auditHealth: Math.round(auditScore),
    },
  };
}

export function useCompositeHealth(): CompositeHealth {
  const boot = useBootStatus();

  const [audit, setAudit] = useState<AuditStats>({
    receipts: 0, receiptPassRate: 0,
    derivations: 0, gradeARate: 0,
    certificates: 0, certValidRate: 0,
    traces: 0, loading: true,
  });

  // Fetch audit stats once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rRes, dRes, cRes, tRes] = await Promise.all([
          supabase.from("uor_receipts").select("self_verified", { count: "exact", head: false }),
          supabase.from("uor_derivations").select("epistemic_grade", { count: "exact", head: false }),
          supabase.from("uor_certificates").select("valid", { count: "exact", head: false }),
          supabase.from("uor_traces").select("trace_id", { count: "exact", head: true }),
        ]);
        if (cancelled) return;

        const receipts = rRes.data ?? [];
        const derivations = dRes.data ?? [];
        const certificates = cRes.data ?? [];

        const receiptPass = receipts.filter((r: any) => r.self_verified).length;
        const gradeA = derivations.filter((d: any) => d.epistemic_grade === "A").length;
        const certValid = certificates.filter((c: any) => c.valid).length;

        setAudit({
          receipts: receipts.length,
          receiptPassRate: receipts.length > 0 ? Math.round((receiptPass / receipts.length) * 100) : 0,
          derivations: derivations.length,
          gradeARate: derivations.length > 0 ? Math.round((gradeA / derivations.length) * 100) : 0,
          certificates: certificates.length,
          certValidRate: certificates.length > 0 ? Math.round((certValid / certificates.length) * 100) : 0,
          traces: tRes.count ?? 0,
          loading: false,
        });
      } catch {
        if (!cancelled) setAudit((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const errorBudget = useMemo(() => getErrorBudget(), [boot.lastVerified]);

  const result = useMemo(
    () => computeScore(boot.status, errorBudget, audit),
    [boot.status, errorBudget, audit],
  );

  return {
    ...result,
    audit,
    bootStatus: boot,
  };
}
