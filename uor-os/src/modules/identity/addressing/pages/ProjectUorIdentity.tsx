import { useState } from "react";
import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-identity.jpg";
import ClaimIdentityDialog from "@/modules/identity/addressing/components/ClaimIdentityDialog";

const ProjectUorIdentity = () => {
  const [claimOpen, setClaimOpen] = useState(false);

  return (
  <>
  <ClaimIdentityDialog open={claimOpen} onOpenChange={setClaimOpen} />
  <ProjectDetailLayout
    name="UOR Identity"
    slug="uor-identity"
    category="Core Infrastructure"
    tagline="One permanent, private identity derived from who you are, not which service you signed up for. Works everywhere. Controlled entirely by you."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation"
    agentInstructions={[
      { action: "Create your identity", detail: "Your canonical ID is derived from your attributes via a deterministic pipeline. Same person, same relationships, same identity everywhere." },
      { action: "Build your security posture", detail: "Post-quantum keypairs sign every action. Your trust score grows with verified interactions." },
      { action: "Interact across the ecosystem", detail: "One identity works across every application. No separate signups, no password resets." },
      { action: "Control your data", detail: "Your sovereign data dashboard gives you full visibility and control over what you share." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Digital identity is scattered across hundreds of platforms. Every service demands a separate signup, a new set of credentials. The result: forgotten passwords, recycled credentials, and personal data spread across servers you don't control.
            </p>
            <p>
              When one of those servers is breached, your data is exposed not because of something you did wrong, but because the system is structurally broken. Your identity shouldn't depend on a company's security budget.
            </p>
            <p>
              For AI agents, the problem is worse. Agents typically have no persistent identity at all. They are ephemeral processes that vanish when their session ends.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              UOR Identity gives you a single, permanent digital identity that works across every application. It is available to both humans and AI agents. Instead of creating another account with another password, you create one identity, once, and it works everywhere.
            </p>
            <p>
              Your identity is not a username stored in a company's database. It is a mathematically derived fingerprint produced by a deterministic pipeline. No one assigns it to you. No one can take it away.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setClaimOpen(true)}
                className="btn-primary inline-flex items-center gap-2 text-base"
              >
                Claim UOR Identity
              </button>
            </div>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              There are two paths to claiming an identity:
            </p>
            <div className="mt-4 space-y-6">
              <div>
                <p className="font-semibold text-foreground mb-2">For humans</p>
                <p>Sign in with Google or verify your email. Your verified attributes are serialized into a standard form, then hashed to produce your permanent canonical ID. You can always re-authenticate with the same credential to access your identity.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">For AI agents</p>
                <p>Agents prove their existence through computation. A fresh cryptographic keypair is generated, the agent executes its first algebraic proof, and the public key plus proof trace are combined and hashed to produce the agent's permanent identity. The private key never leaves the device.</p>
              </div>
            </div>
            <p className="mt-4">
              In both cases, identity is defined by a living graph of relationships. Every person, app, dataset, or organization you interact with becomes a verifiable node in your identity graph. You decide which relationships are public and which remain private.
            </p>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Single sign-on without a provider.</strong> One identity across all applications. No OAuth dependency, no third-party lock-in.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI agent identity.</strong> Give agents persistent, verifiable identities that survive across sessions and systems.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Cross-platform data control.</strong> Manage exactly what you share, with whom, and for how long from a single dashboard.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Trust without institutions.</strong> Your identity is mathematically verifiable. No certificate authority, no password database, no single point of failure.</span>
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
