/**
 * verify module barrel export (merged from verify + self-verify).
 */

export { withVerifiedReceipt } from "./receipt-manager";
export { getReceiptsForOperation, getReceiptsForModule, verifyReceiptChain, exportAuditTrail, getRecentReceipts, getRecentDerivations, getRecentCertificates } from "./audit-trail";
export type { AuditDerivation, AuditCertificate } from "./audit-trail";
export { systemIntegrityCheck } from "./integrity-check";
export type { CheckResult, IntegrityReport } from "./integrity-check";
export { default as AuditPage } from "./pages/AuditPage";
