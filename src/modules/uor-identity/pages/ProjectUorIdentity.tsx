import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-identity.jpg";

const ProjectUorIdentity = () => (
  <ProjectDetailLayout
    name="UOR Identity"
    slug="uor-identity"
    category="Core Infrastructure"
    tagline="Create a secure, content-addressed identity derived from your relationships and behavior — one identity to build, interact, and transact across the entire Hologram ecosystem."
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
              UOR Identity is the sovereign identity layer for the Hologram ecosystem. It gives every user a single, permanent, content-addressed identity that is derived from <em>what they are</em> — their relationships, their behavior, their cryptographic attributes — not from where they signed up.
            </p>
            <p>
              Unlike traditional identity systems that assign arbitrary usernames or email-based accounts, UOR Identity treats every person as a data object in the universal graph. Your identity is mathematically determined by your connections to other objects (people, applications, organizations) and your behavioral footprint within the ecosystem.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Today's internet forces users to create dozens of separate accounts across different services. Each account fragments your identity, scatters your data, and hands control to platform operators. Password resets, data breaches, and profile duplication are symptoms of a fundamentally broken model.
            </p>
            <p>
              UOR Identity eliminates this entire class of problems. One identity. One login. One place to build your security posture, manage your relationships, and interact with every member and application in the ecosystem. Your identity travels with you because it is <em>you</em> — not a record in someone else's database.
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
        heading: "Get started",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Visit <Link to="/your-space" className="text-primary hover:underline">Your Space</Link> to create your sovereign identity and manage your data dashboard.</span>
            </li>
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
