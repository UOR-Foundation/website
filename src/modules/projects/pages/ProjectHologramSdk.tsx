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
                <span><strong className="text-foreground">80/20 split.</strong> 80% of subscription revenue goes to developers, 20% to the platform for hosting and payments.</span>
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
        heading: "Get started",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Open the <Link to="/console" className="text-primary hover:underline">Hologram Console</Link> to create your identity and deploy your first app.</span>
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
