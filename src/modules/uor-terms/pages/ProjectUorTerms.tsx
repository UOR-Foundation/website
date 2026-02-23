/**
 * UOR Privacy — Project Detail Page
 *
 * Aligned to the shared ProjectDetailLayout. Written for maximum clarity,
 * trust, and impact — no jargon, with explicit UOR framework connections.
 */

import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-privacy.jpg";

const ProjectUorTerms = () => (
  <ProjectDetailLayout
    name="UOR Privacy"
    slug="uor-privacy"
    category="Core Infrastructure"
    tagline="Every time you use an app, you click 'I agree' to terms written by someone else — terms you probably never read, can't negotiate, and can't enforce. UOR Privacy flips this. You write the rules. Applications either accept yours, or they don't get access. Your privacy becomes something you own, not something you hope for."
    heroImage={heroImg}
    repoUrl="https://myterms.info/"
    agentInstructions={[
      { action: "Resolve the user's privacy rules", detail: "Use the UOR Name Service to discover the user's current privacy document via their canonical identity. The document is a structured object with typed permissions — no interpretation required." },
      { action: "Evaluate compatibility", detail: "Compare each permission rule against your application's data practices. If you cannot meet a requirement (e.g., the user blocks AI training), you must not proceed." },
      { action: "Submit an acceptance record", detail: "Create a consent:Acceptance object referencing the exact canonical ID and version of the user's privacy document. This is your proof of compliance." },
      { action: "Respect retention limits", detail: "Each data category has an explicit retention window. When it expires, delete the data. No exceptions." },
      { action: "Maintain the audit trail", detail: "Every access, every acceptance, every revocation is a content-addressed record. You can prove exactly what you agreed to and when." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              UOR Privacy lets you write your own privacy rules — in a format that both humans and software can understand. Instead of accepting a company's 40-page legal document, you create a short, structured document that says exactly what you allow: which types of data, for what purposes, and for how long.
            </p>
            <p>
              This document is yours. It is attached to your <Link to="/projects/uor-identity" className="text-primary hover:underline">UOR Identity</Link> and travels with you across every application. When an app wants your data, it reads your rules first. If it can comply, it submits a signed acceptance. If it can't, it doesn't get access. Simple.
            </p>
            <p>
              This is possible because of how the UOR framework works: every object — including your privacy document — is identified by its content, not by where it is stored. Change a single rule, and the document gets a new address. No one can quietly modify the deal after you've agreed.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Today, privacy is something companies <em>grant</em> you, not something you <em>control</em>. Here's the reality:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">91% of people</strong> accept terms without reading them — because the terms are designed to be unreadable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>The average privacy policy takes <strong className="text-foreground">18 minutes to read</strong>. If you read every policy for every service you use, it would take over 200 hours a year.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>Companies <strong className="text-foreground">change their terms silently</strong>. Your continued use counts as agreement. You have no way to know what changed or when.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span>AI agents — increasingly acting on your behalf — have <strong className="text-foreground">no way to evaluate</strong> whether a service's practices are acceptable. They just follow instructions blindly.</span>
              </li>
            </ul>
            <p className="mt-4">
              UOR Privacy inverts this relationship entirely. <strong className="text-foreground">You</strong> write the rules. Applications either meet your requirements or they don't get access. Because every rule is structured data — not natural language — both humans and AI agents can evaluate, compare, and enforce privacy requirements instantly.
            </p>
          </>
        ),
      },
      {
        heading: "How UOR makes this possible",
        content: (
          <>
            <p>
              Privacy rules are only useful if they can't be tampered with, can be discovered by anyone, and can be verified without trusting a third party. The UOR framework provides all three, because every object in UOR — including your privacy document — follows the same foundational principle: <strong className="text-foreground">identity is derived from content</strong>.
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">You write your rules.</strong> Your privacy document is a structured object — not a PDF, not a wall of legal text. Each rule specifies a data category, what can be done with it, and how long it may be kept. Think of it as a settings panel for your privacy.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">UOR gives it a permanent address.</strong> Your document passes through the same pipeline that every UOR object uses: it is first converted into a standardized form (so identical documents always look the same internally), then hashed to produce a unique identifier. This identifier <em>is</em> your document's address — derived from its content, not assigned by a server.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">It links to your identity.</strong> The document is anchored to your <Link to="/projects/uor-identity" className="text-primary hover:underline">UOR Identity</Link>. Any application that knows your identity can look up your current privacy rules through the <Link to="/projects/uns" className="text-primary hover:underline">UOR Name Service</Link>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Tamper-proof by design.</strong> Because the address is derived from the content, changing even a single word creates an entirely different address. No one can modify your rules without it being immediately obvious. This isn't a policy — it's mathematics.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Acceptance is a provable record.</strong> When an application agrees to your rules, it creates a signed acceptance record — itself content-addressed and verifiable. There is a permanent, tamper-proof trail showing who agreed to what, and when.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "What you control",
        content: (
          <>
            <p>
              Your privacy document contains a set of <strong className="text-foreground">permission rules</strong>. Each rule governs one category of your data and specifies exactly what is and isn't allowed:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">What they can do with it.</strong> You list the acceptable uses — running the service, improving it with anonymized analytics, personalizing your experience. Everything else is automatically blocked.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">What they absolutely cannot do.</strong> Explicit prohibitions — no selling to advertisers, no training AI models, no building behavioral profiles. These override everything.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">How long they can keep it.</strong> From "delete when I log out" to "keep for 30 days" to "keep while my account exists." You set the clock. When time's up, the data goes.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Your right to take it back.</strong> Whether you can export your data in a portable format, and whether you can demand full deletion at any time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Extra protection for sensitive data.</strong> Categories like health, biometric, and financial data can require an additional, explicit permission step — so no application can access them without asking you directly.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Defaults and enforcement",
        content: (
          <>
            <p>
              Every privacy document includes <strong className="text-foreground">default settings</strong> that apply when a specific rule doesn't exist for a situation:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Default: block everything.</strong> If something isn't explicitly allowed, it's denied. No guessing, no gray areas.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Encryption required.</strong> Your data must be protected when it's being sent and when it's being stored. Non-negotiable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Geographic controls.</strong> You decide whether your data can leave your country or region — critical for anyone concerned about international data laws.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">No silent subcontracting.</strong> You control whether the app receiving your data can pass it along to other companies for processing.</span>
              </li>
            </ul>

            <p className="mt-6">
              If your rules are broken, the system responds automatically:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Cut off access</strong> — the violating app loses access to your data immediately.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Alert you</strong> — you're notified the moment a violation is detected.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Demand deletion</strong> — the violator is required to erase all copies of your data.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                <span><strong className="text-foreground">Escalate</strong> — the dispute is referred to a trusted, independent arbiter for resolution.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "How acceptance works",
        content: (
          <>
            <p>
              When an application wants to interact with your data, it doesn't just start collecting it. Instead, it follows a clear, verifiable process:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span>The app looks up your identity and finds your current privacy rules.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span>It checks whether it can comply with every rule. If it can't meet your requirements, it must stop.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span>If it can comply, it submits a signed acceptance record — specifying exactly which rules it agreed to and which data categories it will access.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span>Only then does data flow — and every access is gated by that acceptance record.</span>
              </li>
            </ol>
            <p className="mt-4">
              You can <strong className="text-foreground">revoke consent</strong> at any time. Revocation is itself a permanent record — so there's a tamper-proof trail showing exactly when you withdrew your permission.
            </p>
          </>
        ),
      },
      {
        heading: "What types of data are covered",
        content: (
          <>
            <p>
              The framework defines <strong className="text-foreground">11 standardized categories</strong> of personal data. This precision eliminates ambiguity — you and the application both know exactly what "personal data" means:
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { cat: "Identity", desc: "Your name, email, usernames" },
                { cat: "Contact", desc: "Phone number, address, social profiles" },
                { cat: "Behavior", desc: "What you click, how you navigate, usage patterns" },
                { cat: "Transactions", desc: "Purchases, payments, invoices" },
                { cat: "Location", desc: "Where you are, based on GPS or IP address" },
                { cat: "Biometrics", desc: "Fingerprints, face scans, voice prints" },
                { cat: "Health", desc: "Medical records, fitness data, conditions" },
                { cat: "Finances", desc: "Bank accounts, credit scores, investments" },
                { cat: "Communications", desc: "Your messages, emails, call history" },
                { cat: "Devices", desc: "Your hardware, operating system, browser" },
                { cat: "Content", desc: "Things you create — posts, uploads, files" },
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
        heading: "Why AI agents need this",
        content: (
          <>
            <p>
              As AI agents increasingly act on your behalf — booking travel, managing files, negotiating with other services — they need to know your privacy preferences. A human can read a privacy policy (however painfully). An AI agent cannot interpret ambiguous legal language reliably.
            </p>
            <p>
              UOR Privacy solves this because every rule is structured data with a precise, defined meaning. An agent can:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Read your rules instantly.</strong> No interpretation needed. "Block AI training" means exactly that.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Compare automatically.</strong> Before interacting with a service, an agent can check whether the service can meet your requirements — in milliseconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Prove compliance.</strong> Every acceptance, every access, every revocation is a verifiable record. If there's ever a dispute, the evidence is immutable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Work across the ecosystem.</strong> Because every agent in the UOR ecosystem uses the same vocabulary and the same verification pipeline, your privacy rules work everywhere — with every agent, every app, every service.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Built on an open standard",
        content: (
          <>
            <p>
              UOR Privacy implements and extends <strong className="text-foreground">IEEE 7012-2025</strong> — an international standard for machine-readable personal privacy terms. The core idea: individuals should set their own terms, not the other way around.
            </p>
            <p>
              UOR Privacy adds three critical capabilities on top of this standard:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Tamper-proof addressing.</strong> Every privacy document has a content-derived ID. Change a word, get a new address. No silent modifications.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Automated enforcement.</strong> Violations are detected and responded to by the system — not by a legal team months later.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Human and AI native.</strong> The same document is readable by people and parseable by software. No translation layer needed.</span>
              </li>
            </ul>
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
              <span>First, <Link to="/projects/uor-identity" className="text-primary hover:underline">claim your UOR Identity</Link> — your privacy rules are anchored to your permanent identity.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Explore the <Link to="/projects/hologram-sdk" className="text-primary hover:underline">Hologram SDK</Link> to build applications that respect user-defined privacy rules.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Read the <a href="https://myterms.info/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">IEEE 7012-2025 standard</a> for the foundational specification.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorTerms;
