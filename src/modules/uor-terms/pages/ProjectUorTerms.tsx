/**
 * UOR Terms — Project Detail Page
 *
 * Comprehensive documentation of the UOR Terms module:
 * machine-readable, content-addressed personal privacy terms
 * aligned with IEEE 7012-2025 and the UOR canonical pipeline.
 */

import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-terms.jpg";

const ProjectUorTerms = () => (
  <ProjectDetailLayout
    name="UOR Terms"
    slug="uor-terms"
    category="Core Infrastructure"
    tagline="Your data. Your rules. UOR Terms lets every individual — human or AI agent — define their own machine-readable terms and conditions. When any application or agent wants to interact with you, they must first accept your terms — not the other way around. Privacy becomes programmable, enforceable, and content-addressed."
    heroImage={heroImg}
    repoUrl="https://myterms.info/"
    agentInstructions={[
      { action: "Define your terms", detail: "Create a structured JSON-LD terms document specifying which data categories you allow, for what purposes, and how long they may be retained. Every rule is machine-readable." },
      { action: "Canonicalize and hash", detail: "Your terms document passes through the URDNA2015 → SHA-256 pipeline, producing a permanent canonical ID. Same terms, same hash — verifiable by anyone." },
      { action: "Publish your terms", detail: "Your terms are content-addressed and can be resolved by any application via your UOR identity. They travel with you across the entire ecosystem." },
      { action: "Require acceptance", detail: "Before any external application or agent can access your data, they must submit a consent:Acceptance record referencing your terms' canonical ID and version." },
      { action: "Enforce and audit", detail: "Violations trigger automated enforcement actions — from access revocation to arbiter escalation. Every access is logged in an immutable audit trail." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              UOR Terms is a framework for <strong className="text-foreground">individual-controlled, machine-readable privacy terms</strong>. Instead of clicking "I agree" on terms written by corporations, you write your own terms — and every application that wants your data must accept <em>yours</em>.
            </p>
            <p>
              Each terms document is a structured JSON-LD object that specifies exactly which categories of your data may be accessed, for which purposes, how long it may be retained, and what happens if those rules are violated. The document is canonicalized via URDNA2015 and hashed with SHA-256, producing a permanent, tamper-evident <strong className="text-foreground">canonical ID</strong> — just like every other object in the UOR framework.
            </p>
            <p>
              This aligns with <strong className="text-foreground">IEEE 7012-2025</strong> (Machine Readable Personal Privacy Terms), extending the standard with content-addressed verification and cryptographic enforcement.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The UOR Terms lifecycle follows five deterministic steps — each one verifiable, auditable, and irreversible:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Author.</strong> You create a terms document specifying your permissions — which data categories are allowed, for what purposes, with what retention limits. Each permission is a typed JSON-LD object with precise semantics.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Canonicalize.</strong> The terms document is processed through URDNA2015, producing deterministic N-Quads. This guarantees that identical terms — regardless of key order, whitespace, or serialization — always produce the same canonical form.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Hash.</strong> SHA-256 produces a permanent canonical ID for the terms document. This ID is your terms' address — content-derived, globally unique, and tamper-evident.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Publish.</strong> The terms document is linked to your UOR Identity. Any application resolving your identity can discover your current terms and their canonical ID.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Gate.</strong> Before accessing your data, an application must submit a <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">consent:Acceptance</code> record referencing the exact canonical ID and version of your terms. No acceptance, no access.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "The permissions model",
        content: (
          <>
            <p>
              Every terms document contains a set of <strong className="text-foreground">permission rules</strong>. Each rule governs a specific category of data and defines:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Allowed purposes.</strong> What the data may be used for — core service delivery, analytics, personalization, etc. Everything not explicitly allowed is denied by default.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Denied purposes.</strong> Explicit prohibitions — no AI training, no third-party sharing, no profiling. These override any ambiguity.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Retention limits.</strong> How long data may be kept — from session-only (deleted immediately) to custom durations measured in days. No open-ended data hoarding.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Export and deletion rights.</strong> Whether you can export your data in a portable format, and whether you can request full deletion at any time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Explicit consent flags.</strong> Sensitive categories (biometric, health, financial) can require an additional, explicit consent step before any access is permitted.</span>
              </li>
            </ul>

            <div className="mt-6 bg-muted/40 border border-border rounded-2xl p-5 overflow-x-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Example permission rule</p>
              <pre className="text-xs font-mono text-muted-foreground leading-relaxed">
{`{
  "@type": "terms:Permission",
  "terms:dataCategory": "terms:BehavioralData",
  "terms:allowedPurposes": ["terms:CoreService", "terms:Analytics"],
  "terms:deniedPurposes": ["terms:AITraining", "terms:Advertising", "terms:Profiling"],
  "terms:retention": "terms:30Days",
  "terms:requiresExplicitConsent": false,
  "terms:allowsExport": true,
  "terms:allowsDeletion": true
}`}
              </pre>
            </div>
          </>
        ),
      },
      {
        heading: "Global defaults and enforcement",
        content: (
          <>
            <p>
              Every terms document includes <strong className="text-foreground">global defaults</strong> that apply when no specific permission rule matches a request:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Default deny.</strong> If enabled, any data access not explicitly permitted is automatically blocked. This is the recommended setting.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Encryption required.</strong> Data must be encrypted both in transit and at rest. No exceptions.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Cross-border controls.</strong> Whether your data may leave your legal jurisdiction. Critical for GDPR, CCPA, and other regulatory compliance.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Sub-processor restrictions.</strong> Whether the receiving application may delegate data handling to third-party processors.</span>
              </li>
            </ul>

            <p className="mt-6">
              When terms are violated, the enforcement engine triggers automated responses:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Revoke access</strong> — immediately terminate the violator's data access.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Notify owner</strong> — alert you that a violation was detected.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Request deletion</strong> — demand the violator delete all copies of your data.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Escalate to arbiter</strong> — refer the dispute to a trusted, content-addressed third party for resolution.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Consent and acceptance",
        content: (
          <>
            <p>
              When an application or agent wants to interact with you, it must submit a <strong className="text-foreground">consent:Acceptance</strong> record. This record is itself a content-addressed JSON-LD object, proving:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Which terms</strong> were accepted (by canonical ID and version).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Who accepted</strong> (the acceptor's UOR canonical ID).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">When</strong> the acceptance occurred (ISO 8601 timestamp).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">What scope</strong> — which data categories the acceptor acknowledged.</span>
              </li>
            </ul>
            <p className="mt-4">
              Consent records can be <strong className="text-foreground">revoked</strong> at any time by the terms owner. Revocation is also a content-addressed record, creating an immutable audit trail of consent lifecycle events.
            </p>

            <div className="mt-6 bg-muted/40 border border-border rounded-2xl p-5 overflow-x-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acceptance flow (pseudocode)</p>
              <pre className="text-xs font-mono text-muted-foreground leading-relaxed">
{`// 1. Application resolves the user's identity
const user = await uns.resolve("alice.uor");

// 2. Fetch the user's current terms
const terms = await uns.resolveTerms(user.canonicalId);

// 3. Validate compatibility
if (!isCompatible(terms, myAppCapabilities)) {
  throw new Error("Cannot meet user's privacy requirements");
}

// 4. Submit acceptance
const consent = await terms.accept({
  acceptorCanonicalId: myApp.canonicalId,
  scope: ["terms:IdentityData", "terms:TransactionData"],
});

// 5. Now interact — all access is gated by the consent record
const data = await user.getData({ consentId: consent.canonicalId });`}
              </pre>
            </div>
          </>
        ),
      },
      {
        heading: "Data categories",
        content: (
          <>
            <p>
              The framework defines <strong className="text-foreground">11 standardized data categories</strong>, each with precise semantics. This ensures there is no ambiguity about what "personal data" means:
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { cat: "Identity Data", desc: "Names, emails, identifiers" },
                { cat: "Contact Data", desc: "Phone, address, social handles" },
                { cat: "Behavioral Data", desc: "Clicks, navigation, usage" },
                { cat: "Transaction Data", desc: "Purchases, payments, invoices" },
                { cat: "Location Data", desc: "GPS, IP-based geolocation" },
                { cat: "Biometric Data", desc: "Fingerprints, face, voice" },
                { cat: "Health Data", desc: "Medical records, fitness" },
                { cat: "Financial Data", desc: "Bank accounts, credit scores" },
                { cat: "Communication Data", desc: "Messages, emails, call logs" },
                { cat: "Device Data", desc: "Hardware IDs, OS, browser" },
                { cat: "Content Data", desc: "User uploads, generated content" },
              ].map(({ cat, desc }) => (
                <div key={cat} className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{cat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Today, "terms and conditions" are written by companies, for companies. They are designed to be long, unreadable, and legally impenetrable — ensuring you click "I agree" without understanding what you've agreed to. The result:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">91% of people</strong> accept terms without reading them.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>The average privacy policy takes <strong className="text-foreground">18 minutes to read</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>Companies change their terms <strong className="text-foreground">without meaningful notice</strong>, and your continued use counts as consent.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>AI agents have <strong className="text-foreground">no way to programmatically evaluate</strong> whether a service's data practices are acceptable.</span>
              </li>
            </ul>
            <p className="mt-4">
              UOR Terms inverts the relationship. <strong className="text-foreground">You</strong> write the terms. Applications either accept them or they don't get access. Terms are machine-readable, so AI agents can evaluate compatibility automatically. And because every terms document is content-addressed, any modification is immediately detectable — no one can silently change the deal.
            </p>
          </>
        ),
      },
      {
        heading: "For AI agents",
        content: (
          <>
            <p>
              UOR Terms is designed to be <strong className="text-foreground">natively consumed by AI agents</strong>. Every field is typed, every value is from a controlled vocabulary, and the entire document is machine-parseable JSON-LD. This means:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Automated compliance.</strong> An agent can read a user's terms, compare them against its own capabilities, and decide in milliseconds whether it can comply.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Zero ambiguity.</strong> No natural-language interpretation required. "terms:AITraining" in the denied list means no AI training. Period.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Verifiable consent chain.</strong> Every acceptance, revocation, and violation is a content-addressed record. Agents can prove they had valid consent at any point in time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Cross-agent interoperability.</strong> Because terms use a shared vocabulary and canonical pipeline, any agent in the UOR ecosystem can understand and enforce any user's terms.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "IEEE 7012-2025 alignment",
        content: (
          <>
            <p>
              UOR Terms implements and extends <strong className="text-foreground">IEEE 7012-2025</strong> — the Standard for Machine Readable Personal Privacy Terms. The standard defines:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>A machine-readable format for expressing personal privacy preferences.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>Standardized agreement types between individuals and organizations.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>A framework where individuals set the terms, not organizations.</span>
              </li>
            </ul>
            <p className="mt-4">
              UOR Terms extends this standard by adding <strong className="text-foreground">content-addressing</strong> (every terms document has a verifiable canonical ID), <strong className="text-foreground">cryptographic enforcement</strong> (violations are detected and acted upon automatically), and <strong className="text-foreground">agent-native semantics</strong> (terms are designed for both human and AI consumption).
            </p>
            <p className="mt-3">
              Learn more at <a href="https://myterms.info/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">myterms.info</a>.
            </p>
          </>
        ),
      },
      {
        heading: "Get started",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>First, <Link to="/projects/uor-identity" className="text-primary hover:underline">claim your UOR Identity</Link> — terms are anchored to your canonical ID.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Explore the <Link to="/projects/hologram-sdk" className="text-primary hover:underline">Hologram SDK</Link> to build applications that respect user-defined terms.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Read the <a href="https://myterms.info/ieee7012-standards/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">IEEE 7012-2025 standard</a> for the foundational specification.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorTerms;
