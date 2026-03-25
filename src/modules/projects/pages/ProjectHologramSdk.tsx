import { Link } from "react-router-dom";
import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-hologram-sdk.jpg";

const ProjectHologramSdk = () => (
  <ProjectDetailLayout
    name="Hologram SDK"
    slug="hologram-sdk"
    category="Developer Tools"
    tagline="The developer toolkit for building, shipping, and running applications on the Hologram platform. One identity, one build, every device."
    heroImage={heroImg}
    repoUrl="/console"
    agentInstructions={[
      { action: "Create your identity", detail: "Every user is a data object. Your canonical ID is derived from your attributes, giving you one login for all apps." },
      { action: "Build your app", detail: "Import code from a repo, URL, or file. The SDK content-addresses your code into a verifiable image." },
      { action: "Ship to the registry", detail: "Push the image to the UOR registry with a signed certificate. Every deployment is versioned and tamper-evident." },
      { action: "Run anywhere", detail: "Execute via WASM on any device. One build, one identity, every platform." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Getting an app to production is hard. Deploying, monetizing, and securing a web app requires battling git, database migrations, API keys, spam signups, rate-limiting, and email infrastructure. The initial spark of joy quickly turns into overhead.
            </p>
            <p>
              Most developers spend more time on infrastructure than on the product itself.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              Hologram SDK gives developers everything they need to go from idea to live, running application. One database. One authentication system. One payment provider. Everything wired in and active by default.
            </p>
            <p>
              Every user, every app, and every deployment is a content-addressed data object. Identity is derived from what you are, not where you signed up. One login works across all apps in the ecosystem.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The SDK implements a five-stage pipeline:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Identity.</strong> Create a universal identity. One login for all apps.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Build.</strong> Import code from a repo, URL, or file. The SDK packages it into a verifiable image.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Gate.</strong> Every deployment passes through a three-layer security check: credential scanning, content verification, and injection detection.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Ship.</strong> Push to the registry with a signed certificate. Code, dependencies, and data are bound into a single versioned snapshot.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Run.</strong> Execute via WASM on any device. Revenue is tracked automatically.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Solo developers.</strong> Ship a production app without managing infrastructure, auth, or payments yourself.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Creative builders.</strong> Turn ideas into live, monetized apps without touching DevOps.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Teams needing verifiable deploys.</strong> Every deployment carries a signed certificate. You can prove exactly what code is running.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Cross-platform applications.</strong> One build runs on any device via WASM, from browsers to embedded systems.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectHologramSdk;
