import { Link } from "react-router-dom";
import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-hologram-sdk.jpg";

const ProjectHologramSdk = () => (
  <ProjectDetailLayout
    name="Hologram SDK"
    slug="hologram-sdk"
    category="Developer Tools"
    tagline="Build, ship, and run applications with one identity, one gate, and one balance. The SDK for creative builders who want to turn ideas into live, monetized apps."
    heroImage={heroImg}
    repoUrl="/console"
    agentInstructions={[
      { action: "Create your identity", detail: "Every user is a data object. Your canonical ID is derived from your attributes via URDNA2015 → SHA-256 — the same pipeline used for every object in the framework." },
      { action: "Build your app", detail: "Paste a GitHub repo, live URL, or ZIP. The SDK content-addresses your code into a verifiable image — like docker build." },
      { action: "Ship to the registry", detail: "Push the image to the UOR registry with a signed certificate. Every deployment is versioned and tamper-evident — like docker push." },
      { action: "Run anywhere", detail: "Execute via WASM on any device. One build, one identity, every platform — like docker run." },
      { action: "Monetize automatically", detail: "Revenue minus costs. The SDK handles subscriptions, API billing, and pooled revenue distribution across all apps in the ecosystem." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              Hologram SDK is the developer toolkit for the Hologram Console — a managed application platform built on the UOR Framework. It gives creative builders everything they need to go from idea to live, monetized app without touching git, database migrations, or API keys.
            </p>
            <p>
              Every user, every app, and every deployment is a content-addressed data object. Identity is derived from what you are, not where you signed up. One login works across all apps in the ecosystem.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Getting an app to production is hard. Deploying, monetizing, and securing a web app requires battling git, database migrations, API keys, spam signups, rate-limiting, and email infrastructure. The initial spark of joy quickly turns into a tax return.
            </p>
            <p>
              The Hologram SDK eliminates this entire class of problems. One database. One authentication system. One payment provider. Everything wired in and active by default. Anything not on the whitelist is rejected by the security gate before it reaches production.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The SDK implements a five-stage pipeline, each producing a content-addressed certificate that binds code, data, and identity together:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Identity.</strong> Create a universal identity. Your canonical ID is derived from your cryptographic attributes — one login for all apps.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Build.</strong> Import code from a repo, URL, or file. The SDK canonicalizes it into a content-addressed image with a unique deployment snapshot.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Gate.</strong> Every deployment passes through a three-layer security gate: credential scanning, partition density verification, and injection detection. No code reaches production until it clears all three.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Ship.</strong> Push to the registry with a signed certificate. Code, dependencies, and data are bound into a single versioned snapshot.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Run.</strong> Execute via WASM. Revenue is tracked automatically — subscriptions, API costs, and pooled payouts are all handled by the platform.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "Revenue model",
        content: (
          <>
            <p>
              The SDK implements a YouTube Premium-style revenue model. Users pay a single subscription that covers all apps. Revenue is distributed proportionally based on usage time — the more time people spend in your app, the more you earn.
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">100% dev revenue.</strong> 100% of subscription revenue goes to developers, minus any payment processing fees.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Integrated API costs.</strong> When a user generates an image or video, the cost is deducted from revenue. No separate API keys needed.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">One balance.</strong> Revenue minus costs. If the app makes money, the creator makes money.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Hologram Projection Registry",
        content: (
          <>
            <p>
              Every UOR object is a hologram — one canonical identity projected into every standard on the internet. Just as a hologram encodes a 3D scene into interference patterns viewable from any angle, the UOR hash encodes one identity viewable through any protocol.
            </p>
            <p className="mt-3">
              The Hologram Registry maps the single SHA-256 hash to <strong className="text-foreground">19 protocol-native identifiers</strong> — each a deterministic, pure function:
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                ["CID", "IPFS Multiformats", "lossless"],
                ["JSON-LD", "W3C RDF/SPARQL", "lossless"],
                ["DID", "W3C DID Core", "lossless"],
                ["VC", "W3C VC 2.0", "lossless"],
                ["IPv6", "RFC 4193 ULA", "lossy"],
                ["Glyph", "UOR Braille", "lossless"],
                ["WebFinger", "RFC 7033", "lossy"],
                ["ActivityPub", "W3C Federation", "lossless"],
                ["AT Protocol", "Bluesky", "lossy"],
                ["OIDC", "OpenID Connect", "lossless"],
                ["GS1", "Supply Chain", "lossy"],
                ["OCI", "Containers", "lossless"],
                ["Solid", "W3C WebID", "lossless"],
                ["Open Badges", "1EdTech 3.0", "lossy"],
                ["SCITT", "IETF Supply Chain", "lossless"],
                ["MLS", "RFC 9420", "lossless"],
                ["DNS-SD", "RFC 6763", "lossy"],
                ["STAC", "Geospatial", "lossless"],
                ["Croissant", "MLCommons", "lossless"],
              ].map(([name, standard, fidelity]) => (
                <div key={name} className="flex items-center gap-2 py-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${fidelity === "lossless" ? "bg-primary" : "bg-accent"}`} />
                  <span className="text-sm"><strong className="text-foreground">{name}</strong> <span className="text-muted-foreground">— {standard}</span></span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Lossless (full 256-bit hash preserved)</span>
              {" · "}
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Lossy (truncated for protocol constraints)</span>
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
              <span>Open the <Link to="/console" className="text-primary hover:underline">Hologram Console</Link> to create your identity and deploy your first app.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Visit <Link to="/your-space" className="text-primary hover:underline">Your Space</Link> to manage your sovereign data dashboard.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Read the <Link to="/developers/sdk" className="text-primary hover:underline">SDK documentation</Link> for the full API reference.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Browse the <Link to="/developers/getting-started" className="text-primary hover:underline">Getting Started guide</Link> for a step-by-step walkthrough.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectHologramSdk;
