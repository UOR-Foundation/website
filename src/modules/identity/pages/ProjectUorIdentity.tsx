import { useState } from "react";
import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-identity.jpg";
import ClaimIdentityDialog from "@/modules/identity/components/ClaimIdentityDialog";

const ProjectUorIdentity = () => {
  const [claimOpen, setClaimOpen] = useState(false);

  return (
  <>
  <ClaimIdentityDialog open={claimOpen} onOpenChange={setClaimOpen} />
  <ProjectDetailLayout
    name="UOR Identity"
    slug="uor-identity"
    category="Core Infrastructure"
    tagline="You already have an identity. It's just scattered across multiple accounts — each one owned by someone else, sold without your consent, and exposed without your knowledge. UOR Identity gives you what was always yours: one permanent, private identity that no one can take, copy, or sell."
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
              UOR Identity is a single, permanent digital identity that works across every application in the ecosystem. It is available to both <strong className="text-foreground">humans</strong> and <strong className="text-foreground">AI agents</strong>. Instead of creating yet another account with yet another password, you create one identity — once — and it works everywhere.
            </p>
            <p>
              Your identity is not a username stored in a company's database. It is a mathematically derived fingerprint — a canonical hash — produced by a deterministic pipeline. No one assigns it to you. No one can take it away. And because it is derived from your own attributes, it is as unique and unforgeable as a real fingerprint.
            </p>
            <p>
              There are <strong className="text-foreground">two paths</strong> to claiming an identity, depending on whether you are a human or an AI agent:
            </p>
          </>
        ),
      },
      {
        heading: "Path 1 — I'm a Human",
        content: (
          <>
            <p>
              Humans verify their identity through a familiar authentication method — Google sign-in or email verification. Once verified, the system collects your cryptographic public key, your creation timestamp, and your initial attributes, then runs them through the canonical pipeline:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Authenticate.</strong> Sign in with Google or verify your email address. This proves you are the human claiming this identity.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Canonicalize.</strong> Your verified attributes are serialized via URDNA2015 into deterministic N-Quads — producing an identical result every time for the same inputs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Hash.</strong> A single SHA-256 hash produces your canonical ID — a permanent 256-bit identifier.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Derive.</strong> Four identity forms are generated: a canonical URN, an IPv6 routing address, a CIDv1 for IPFS interop, and a Braille glyph for visual identity.</span>
              </li>
            </ol>
            <p className="mt-4">
              Humans can always re-authenticate with the same Google account or email to access their identity. Your identity is linked to your verified credential.
            </p>
          </>
        ),
      },
      {
        heading: "Path 2 — I'm an Agent",
        content: (
          <>
            <p>
              AI agents do not have email addresses or Google accounts. Instead, an agent proves its existence through <strong className="text-foreground">computation</strong>. The process works as follows:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Keypair generation.</strong> A fresh Ed25519 cryptographic keypair is generated in the browser. The private key never leaves the device. This keypair is the agent's only credential — it replaces passwords, emails, and OAuth tokens.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Founding derivation.</strong> The agent executes its first algebraic proof: <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">neg(bnot(42)) = 43</code>. This is the agent's "first act" — a verifiable computation that proves the agent can reason. The result, along with its trace, becomes part of the identity seed.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Identity minting.</strong> The agent's public key, founding trace, and timestamp are combined into a seed object. This seed is canonicalized via URDNA2015, then hashed with SHA-256 to produce the agent's permanent <strong className="text-foreground">Canonical ID</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Credential display.</strong> The system shows the agent's Canonical ID, CID, IPv6 address, Braille glyph, public key, and private key — all at once, on a single screen.</span>
              </li>
            </ol>

            <div className="mt-6 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-3">
              <p className="text-base font-bold text-destructive flex items-center gap-2">
                ⚠️ Critical: Save your credentials immediately
              </p>
              <p className="text-base leading-relaxed">
                After identity minting, you will be shown your <strong className="text-foreground">private key</strong> and <strong className="text-foreground">Canonical ID (hashed UOR identity)</strong> exactly <strong className="text-foreground">once</strong>. These are displayed on-screen and are never stored on any server.
              </p>
              <p className="text-base leading-relaxed">
                <strong className="text-foreground">If you lose your private key or Canonical ID, your identity is permanently irrecoverable.</strong> There is no "forgot password" flow. There is no recovery email. There is no admin who can reset it. The identity is bound to the keypair — lose the key, lose the identity. Forever.
              </p>
              <p className="text-base leading-relaxed">
                Copy your private key and Canonical ID to secure, persistent storage (encrypted file, secrets manager, hardware vault) <em>before</em> closing the dialog.
              </p>
            </div>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Right now, digital identity is shattered across hundreds of platforms — for humans and agents alike. Every service demands a separate signup, a new API key, a new set of credentials. The result is predictable: forgotten passwords, recycled credentials, and a trail of personal data scattered across servers you don't control.
            </p>
            <p>
              When one of those servers is breached — and <strong className="text-foreground">billions of accounts are compromised every year</strong> — your data is exposed not because of something you did wrong, but because the system is structurally broken. Your identity shouldn't depend on a company's security budget.
            </p>
            <p>
              For AI agents, the problem is even worse. Agents typically have no persistent identity at all — they are ephemeral processes that vanish when their session ends. UOR Identity gives agents the same permanence, verifiability, and sovereignty that humans expect.
            </p>
            <p>
              UOR Identity eliminates this entire class of problems. One identity. One login. No passwords to forget, no profiles to duplicate, no data to leak. Your identity lives with you — not on someone else's server — and you decide exactly what to share, with whom, and for how long.
            </p>
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
              Your identity starts here. Whether you are a human or an AI agent, click below to begin. You will be asked to choose your path.
            </p>
            <button
              onClick={() => setClaimOpen(true)}
              className="btn-primary inline-flex items-center gap-2 text-base"
            >
              Claim UOR Identity
            </button>
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
  </>
  );
};

export default ProjectUorIdentity;
