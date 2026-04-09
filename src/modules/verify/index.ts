/**
 * verify module barrel export (merged from verify + self-verify + trace).
 */

export { withVerifiedReceipt } from "./receipt-manager";
export { getReceiptsForOperation, getReceiptsForModule, verifyReceiptChain, exportAuditTrail, getRecentReceipts, getRecentDerivations, getRecentCertificates } from "./audit-trail";
export type { AuditDerivation, AuditCertificate } from "./audit-trail";
export { systemIntegrityCheck } from "./integrity-check";
export type { CheckResult, IntegrityReport } from "./integrity-check";
export { default as AuditPage } from "./pages/AuditPage";

// ── Absorbed from trace module ──────────────────────────────────────────────
export { recordTrace, getTrace, getRecentTraces } from "./trace";
export type { ComputationTrace, TraceStep } from "./trace";
export { TraceModule } from "./trace-module";
