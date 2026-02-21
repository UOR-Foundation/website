/**
 * UOR Self-Verification Module — the system is its own auditor.
 *
 * Barrel export for the self-verify module.
 */

export { withVerifiedReceipt } from "./receipt-manager";
export { getReceiptsForOperation, getReceiptsForModule, verifyReceiptChain, exportAuditTrail, getRecentReceipts } from "./audit-trail";
export { systemIntegrityCheck } from "./integrity-check";
export type { CheckResult, IntegrityReport } from "./integrity-check";
