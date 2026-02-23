/**
 * UOR Terms — Type Definitions
 *
 * All terms are structured as JSON-LD objects that pass through the
 * canonical pipeline: Object → URDNA2015 → SHA-256 → Canonical ID.
 *
 * This ensures every terms document has a unique, content-derived address
 * that can be verified by any party without a trusted intermediary.
 *
 * Aligned with IEEE 7012-2025 (Machine Readable Personal Privacy Terms).
 */

// ── Core Enums ──────────────────────────────────────────────────────────────

/** Data usage purposes — what a recipient is allowed to do with personal data. */
export type DataPurpose =
  | "terms:CoreService"          // Required for the service to function
  | "terms:Analytics"            // Aggregated, anonymized usage analysis
  | "terms:Personalization"      // Tailoring experience to the user
  | "terms:Marketing"            // Promotional communications
  | "terms:ThirdPartySharing"    // Sharing data with external parties
  | "terms:Research"             // Academic or scientific research
  | "terms:AITraining"           // Training machine learning models
  | "terms:Profiling"            // Building behavioral profiles
  | "terms:Advertising"          // Targeted advertising
  | "terms:LegalCompliance";     // Required by law

/** Retention durations — how long data may be kept. */
export type RetentionPolicy =
  | "terms:SessionOnly"          // Deleted when session ends
  | "terms:TransactionOnly"      // Deleted after transaction completes
  | "terms:30Days"               // Maximum 30 days
  | "terms:90Days"               // Maximum 90 days
  | "terms:1Year"                // Maximum 1 year
  | "terms:AccountLifetime"      // Kept while account exists
  | "terms:Indefinite"           // No expiry (requires explicit consent)
  | "terms:CustomDuration";      // User-specified duration in days

/** Data categories — what types of data are covered. */
export type DataCategory =
  | "terms:IdentityData"         // Name, email, identifiers
  | "terms:ContactData"          // Phone, address, social handles
  | "terms:BehavioralData"       // Clicks, navigation, usage patterns
  | "terms:TransactionData"      // Purchases, payments, invoices
  | "terms:LocationData"         // GPS, IP-based location
  | "terms:BiometricData"        // Fingerprints, face scans, voice
  | "terms:HealthData"           // Medical records, fitness data
  | "terms:FinancialData"        // Bank accounts, credit scores
  | "terms:CommunicationData"    // Messages, emails, call logs
  | "terms:DeviceData"           // Hardware IDs, OS, browser info
  | "terms:ContentData";         // User-generated content, uploads

/** Enforcement actions — what happens on violation. */
export type EnforcementAction =
  | "terms:RevokeAccess"         // Immediately revoke data access
  | "terms:NotifyOwner"          // Alert the data owner
  | "terms:RequestDeletion"      // Demand deletion of all data
  | "terms:SuspendRelationship"  // Pause all interactions
  | "terms:LogViolation"         // Record violation in audit trail
  | "terms:EscalateToArbiter";   // Escalate to a trusted third party

// ── Structured Term Objects ─────────────────────────────────────────────────

/** A single permission rule within a terms document. */
export interface TermsPermission {
  "@type": "terms:Permission";
  "terms:dataCategory": DataCategory;
  "terms:allowedPurposes": DataPurpose[];
  "terms:deniedPurposes": DataPurpose[];
  "terms:retention": RetentionPolicy;
  "terms:retentionDays"?: number;          // For CustomDuration
  "terms:requiresExplicitConsent": boolean;
  "terms:allowsExport": boolean;           // User can export their data
  "terms:allowsDeletion": boolean;         // User can request deletion
}

/** The complete terms document — a user's machine-readable privacy terms. */
export interface UorTermsDocument {
  "@context": "https://uor.foundation/contexts/uor-terms-v1.jsonld";
  "@type": "terms:PersonalTerms";
  "terms:version": string;                    // Semantic version of this terms doc
  "terms:ownerCanonicalId": string;           // The UOR canonical ID of the terms owner
  "terms:createdAt": string;                  // ISO 8601 timestamp
  "terms:updatedAt": string;                  // ISO 8601 timestamp
  "terms:expiresAt"?: string;                 // Optional expiry
  "terms:humanSummary": string;               // Plain-language summary
  "terms:permissions": TermsPermission[];     // The permission rules
  "terms:globalDefaults": TermsGlobalDefaults;
  "terms:enforcement": TermsEnforcement;
  "terms:ieeeAlignment"?: string;             // e.g. "IEEE 7012-2025"
}

/** Global defaults applied when no specific permission rule matches. */
export interface TermsGlobalDefaults {
  "@type": "terms:GlobalDefaults";
  "terms:defaultDeny": boolean;               // If true, anything not explicitly allowed is denied
  "terms:requireEncryption": boolean;         // Data must be encrypted in transit and at rest
  "terms:allowCrossBorder": boolean;          // Data may leave the owner's jurisdiction
  "terms:allowSubProcessors": boolean;        // Recipients may delegate to sub-processors
  "terms:minimumSecurityStandard"?: string;   // e.g. "SOC2", "ISO27001"
}

/** Enforcement configuration — what happens when terms are violated. */
export interface TermsEnforcement {
  "@type": "terms:Enforcement";
  "terms:onViolation": EnforcementAction[];
  "terms:gracePeriodDays": number;            // Days to remedy before enforcement
  "terms:auditTrailRequired": boolean;        // All access must be logged
  "terms:arbiterCanonicalId"?: string;        // Optional trusted arbiter identity
}

// ── Consent & Acceptance ────────────────────────────────────────────────────

/** A consent record — proof that a party accepted specific terms. */
export interface TermsConsent {
  "@context": "https://uor.foundation/contexts/uor-terms-v1.jsonld";
  "@type": "consent:Acceptance";
  "consent:termsCanonicalId": string;         // Canonical ID of the terms document
  "consent:termsVersion": string;             // Version accepted
  "consent:acceptorCanonicalId": string;      // Who accepted (user or app)
  "consent:acceptedAt": string;               // ISO 8601
  "consent:expiresAt"?: string;               // When this consent expires
  "consent:scope": DataCategory[];            // Which categories were consented to
  "consent:signature"?: string;               // Optional cryptographic signature
}

/** A terms revocation — proof that consent was withdrawn. */
export interface TermsRevocation {
  "@context": "https://uor.foundation/contexts/uor-terms-v1.jsonld";
  "@type": "consent:Revocation";
  "consent:consentCanonicalId": string;       // Canonical ID of the consent being revoked
  "consent:revokedAt": string;                // ISO 8601
  "consent:revokerCanonicalId": string;       // Who revoked
  "consent:reason"?: string;                  // Optional reason
}

// ── Verification ────────────────────────────────────────────────────────────

/** Result of verifying a terms document or consent record. */
export interface TermsVerificationResult {
  valid: boolean;
  canonicalId: string;
  version: string;
  ownerCanonicalId: string;
  permissionCount: number;
  isExpired: boolean;
  errors: string[];
}
