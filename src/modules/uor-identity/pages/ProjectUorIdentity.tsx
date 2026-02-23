import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-identity.jpg";

const ProjectUorIdentity = () => (
  <ProjectDetailLayout
    name="UOR Identity"
    slug="uor-identity"
    category="Core Infrastructure"
    tagline="The average person manages over 100 online accounts with dozens of forgotten passwords. Each one is a separate copy of you — owned by someone else, sold without your consent, and breached without your knowledge. UOR Identity replaces all of them with one permanent, private identity that you control."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation"
    agentInstructions={[
      { action: "Create your identity", detail: "Your canonical ID is derived from your attributes and relationships via the URDNA2015 → SHA-256 pipeline. Same person, same relationships, same identity — everywhere." },
      { action: "Map your relationships", detail: "Identity is defined by connections to objects (nouns) — people, apps, data, organizations. Each relationship is a content-addressed triple in your personal graph." },
      { action: "Build your security posture", detail: "Post-quantum Dilithium-3 keypairs sign every action. Your trust score grows with verified interactions, not with how long your account has existed." },
      { action: "Interact across the ecosystem", detail: "One identity works across every Hologram application. No separate signups, no password resets, no fragmented profiles." },
      { action: "Control your data", detail: "Your sovereign data dashboard (Your Space) gives you full visibility and control over what you share, who sees it, and how it is used." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              UOR Identity is a single, permanent digital identity that works across every application in the ecosystem. Instead of creating yet another account with yet another password, you create one identity — once — and it works everywhere.
            </p>
            <p>
              Your identity is not a username stored in a company's database. It is a mathematically derived fingerprint of <em>who you are</em>: your relationships to people, applications, and organizations, combined with your behavioral patterns. No one assigns it to you. No one can take it away. And because it is derived from your own attributes, it is as unique and unforgeable as a real fingerprint.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Right now, your digital identity is shattered across hundreds of platforms. Every service demands a separate signup — a new email, a new password, a new set of terms you never read. The result is predictable: forgotten passwords, recycled credentials, and a trail of personal data scattered across servers you don't control.
            </p>
            <p>
              When one of those servers is breached — and <strong className="text-foreground">billions of accounts are compromised every year</strong> — your data is exposed not because of something you did wrong, but because the system is structurally broken. Your identity shouldn't depend on a company's security budget.
            </p>
            <p>
              And privacy? Every platform builds a profile of you — your habits, your interests, your social graph — and monetizes it. You are the product. You have no visibility into what is collected, no control over who buys it, and no way to delete it.
            </p>
            <p>
              UOR Identity eliminates this entire class of problems. One identity. One login. No passwords to forget, no profiles to duplicate, no data to leak. Your identity lives with you — not on someone else's server — and you decide exactly what to share, with whom, and for how long.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Identity creation follows the same deterministic pipeline used for every object in the UOR Framework:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Attribute collection.</strong> Your cryptographic public key, creation timestamp, and initial relationship set form the seed object.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Canonicalization.</strong> The seed object is serialized via URDNA2015 into deterministic N-Quads — the same canonical form used for every UOR object.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Hashing.</strong> A single SHA-256 hash produces your canonical ID — a permanent, lossless 256-bit identifier.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Derivation.</strong> Four identity forms are derived: canonical URN, IPv6 routing address, CIDv1 for IPFS interop, and a Braille glyph for visual identity.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Relationship binding.</strong> Every connection you make — to a person, an app, an organization — is recorded as a signed, content-addressed triple in your identity graph.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "Identity through relationships",
        content: (
          <>
            <p>
              In the UOR model, identity is not a static profile — it is a living graph of relationships. You are defined by your connections to objects (nouns) and your patterns of interaction (behavior):
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Object relationships.</strong> Every person, app, dataset, or organization you interact with becomes a node in your identity graph. These relationships are content-addressed and verifiable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Behavioral identity.</strong> Your interaction patterns — frequency, consistency, trust score — contribute to a dynamic behavioral fingerprint that strengthens over time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Sovereign control.</strong> You decide which relationships are public and which remain private. Your identity graph is yours — no platform can revoke or modify it.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Claim UOR Identity",
        content: (
          <div className="space-y-6">
            <p>
              Your identity starts here. Claim it once — it's yours forever.
            </p>
            <Link
              to="/claim-identity"
              className="btn-primary inline-flex items-center gap-2 text-base"
            >
              Claim UOR Identity
            </Link>
          </div>
        ),
      },
      {
        heading: "Get started",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Explore the <Link to="/projects/hologram-sdk" className="text-primary hover:underline">Hologram SDK</Link> to build applications that leverage UOR Identity.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Read the <Link to="/developers/getting-started" className="text-primary hover:underline">Getting Started guide</Link> for a step-by-step identity creation walkthrough.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorIdentity;
