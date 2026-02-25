/**
 * UOR Self-Verification: Audit Trail — queryable receipt history.
 *
 * Provides read access to the uor_receipts table for audit and compliance.
 *
 * Delegates to:
 *   - Supabase client for queries
 *   - derivation/receipt for the DerivationReceipt type
 *
 * Zero duplication — uses the same receipt table populated by all modules.
 */

import { supabase } from "@/integrations/supabase/client";
import type { DerivationReceipt } from "@/modules/derivation/receipt";

// ── Row → Receipt mapping ───────────────────────────────────────────────────

interface ReceiptRow {
  receipt_id: string;
  module_id: string;
  operation: string;
  input_hash: string;
  output_hash: string;
  self_verified: boolean;
  coherence_verified: boolean;
  created_at: string;
}

function rowToReceipt(row: ReceiptRow): DerivationReceipt {
  return {
    "@type": "receipt:CanonicalReceipt",
    receiptId: row.receipt_id,
    moduleId: row.module_id,
    operation: row.operation,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    recomputeHash: "", // Not stored; recomputation is done at verification time
    selfVerified: row.self_verified,
    coherenceVerified: row.coherence_verified,
    timestamp: row.created_at,
  };
}

// ── Query functions ─────────────────────────────────────────────────────────

/**
 * Get all receipts for a specific operation type.
 */
export async function getReceiptsForOperation(operation: string): Promise<DerivationReceipt[]> {
  const { data, error } = await supabase
    .from("uor_receipts")
    .select("*")
    .eq("operation", operation)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`getReceiptsForOperation failed: ${error.message}`);
  return (data ?? []).map(rowToReceipt);
}

/**
 * Get all receipts for a specific module.
 */
export async function getReceiptsForModule(moduleId: string): Promise<DerivationReceipt[]> {
  const { data, error } = await supabase
    .from("uor_receipts")
    .select("*")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`getReceiptsForModule failed: ${error.message}`);
  return (data ?? []).map(rowToReceipt);
}

/**
 * Verify that each receipt in a chain is internally consistent.
 * A receipt is consistent if selfVerified && coherenceVerified.
 */
export function verifyReceiptChain(receipts: DerivationReceipt[]): {
  allValid: boolean;
  results: { receiptId: string; valid: boolean; reason?: string }[];
} {
  const results = receipts.map((r) => {
    if (!r.selfVerified) {
      return { receiptId: r.receiptId, valid: false, reason: "Self-verification failed" };
    }
    if (!r.coherenceVerified) {
      return { receiptId: r.receiptId, valid: false, reason: "Ring coherence not verified" };
    }
    return { receiptId: r.receiptId, valid: true };
  });

  return {
    allValid: results.every((r) => r.valid),
    results,
  };
}

/**
 * Export all receipts in a date range as a JSON audit trail.
 */
export async function exportAuditTrail(
  startDate: string,
  endDate: string
): Promise<{ receipts: DerivationReceipt[]; exportedAt: string; count: number }> {
  const { data, error } = await supabase
    .from("uor_receipts")
    .select("*")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) throw new Error(`exportAuditTrail failed: ${error.message}`);
  const receipts = (data ?? []).map(rowToReceipt);

  return {
    receipts,
    exportedAt: new Date().toISOString(),
    count: receipts.length,
  };
}

/**
 * Get recent receipts across all modules.
 */
export async function getRecentReceipts(limit = 50): Promise<DerivationReceipt[]> {
  const { data, error } = await supabase
    .from("uor_receipts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentReceipts failed: ${error.message}`);
  return (data ?? []).map(rowToReceipt);
}

// ── Derivation + Certificate queries (for system-wide audit) ────────────────

export interface AuditDerivation {
  derivationId: string;
  originalTerm: string;
  canonicalTerm: string;
  resultIri: string;
  epistemicGrade: string;
  quantum: number;
  metrics: Record<string, unknown>;
  createdAt: string;
}

export interface AuditCertificate {
  certificateId: string;
  certifiesIri: string;
  derivationId: string | null;
  valid: boolean;
  certChain: unknown[];
  issuedAt: string;
}

/**
 * Get recent derivations, optionally filtered by source module.
 */
export async function getRecentDerivations(
  limit = 50,
  source?: string
): Promise<AuditDerivation[]> {
  let query = supabase
    .from("uor_derivations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by source in metrics JSONB if provided
  if (source) {
    query = query.eq("metrics->>source", source);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getRecentDerivations failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    derivationId: row.derivation_id,
    originalTerm: row.original_term,
    canonicalTerm: row.canonical_term,
    resultIri: row.result_iri,
    epistemicGrade: row.epistemic_grade,
    quantum: row.quantum,
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  }));
}

/**
 * Get recent certificates, optionally filtered by validity.
 */
export async function getRecentCertificates(
  limit = 50,
  validOnly = false
): Promise<AuditCertificate[]> {
  let query = supabase
    .from("uor_certificates")
    .select("*")
    .order("issued_at", { ascending: false })
    .limit(limit);

  if (validOnly) {
    query = query.eq("valid", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getRecentCertificates failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    certificateId: row.certificate_id,
    certifiesIri: row.certifies_iri,
    derivationId: row.derivation_id,
    valid: row.valid,
    certChain: (row.cert_chain as unknown[]) ?? [],
    issuedAt: row.issued_at,
  }));
}
