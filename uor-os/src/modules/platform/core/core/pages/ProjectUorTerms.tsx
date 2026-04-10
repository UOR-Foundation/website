import { Link } from "react-router-dom";
import ProjectDetailLayout from "@/modules/platform/projects/components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-privacy.jpg";

const ProjectUorTerms = () => (
  <ProjectDetailLayout
    name="UOR Privacy"
    slug="uor-privacy"
    category="Core Infrastructure"
    tagline="You write the privacy rules. Applications either accept your terms, or they don't get access. Privacy becomes something you own, not something you hope for."
    heroImage={heroImg}
    repoUrl="https://myterms.info/"
    agentInstructions={[
      { action: "Resolve the user's privacy rules", detail: "Use the UOR Name Service to discover the user's current privacy document via their canonical identity." },
      { action: "Evaluate compatibility", detail: "Compare each permission rule against your application's data practices. If you cannot meet a requirement, you must not proceed." },
      { action: "Submit an acceptance record", detail: "Create a consent acceptance object referencing the exact canonical ID and version of the user's privacy document." },
      { action: "Respect retention limits", detail: "Each data category has an explicit retention window. When it expires, delete the data." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Privacy today is something companies grant you, not something you control. 91% of people accept terms without reading them, because the terms are designed to be unreadable. The average privacy policy takes 18 minutes to read. Companies change their terms silently. Your continued use counts as agreement.
            </p>
            <p>
              AI agents acting on your behalf have no way to evaluate whether a service's practices are acceptable. They just follow instructions blindly.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              UOR Privacy lets you write your own privacy rules in a format that both humans and software can understand. Instead of accepting a company's legal document, you create a short, structured document that says exactly what you allow: which types of data, for what purposes, and for how long.
            </p>
            <p>
              This document is attached to your <Link to="/projects/uor-identity" className="text-primary hover:underline">UOR Identity</Link> and travels with you across every application. When an app wants your data, it reads your rules first. If it can comply, it submits a signed acceptance. If it can't, it doesn't get access.
            </p>
            <p>
              Because every object in UOR is identified by its content, changing a single rule creates a new address. No one can quietly modify the deal after you've agreed.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Your privacy document passes through the same content-addressing pipeline as every UOR object:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">You write your rules.</strong> Each rule specifies a data category, what can be done with it, and how long it may be kept.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">UOR gives it a permanent address.</strong> The document is standardized and hashed. The hash is the address.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Applications look up your rules.</strong> Any app that knows your identity can discover your current privacy document through the <Link to="/projects/uns" className="text-primary hover:underline">UOR Name Service</Link>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Acceptance is a provable record.</strong> When an application agrees to your rules, it creates a signed record. There is a permanent trail showing who agreed to what, and when.</span>
              </li>
            </ol>
            <p className="mt-4">
              You can revoke consent at any time. Revocation is itself a permanent record.
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
              <span><strong className="text-foreground">Personal data control.</strong> Set rules for identity, contact, behavioral, financial, health, and biometric data across all applications.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI agent compliance.</strong> Give agents machine-readable privacy rules they can evaluate and enforce automatically.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Regulatory alignment.</strong> Structured privacy documents map directly to GDPR, CCPA, and other regulatory frameworks.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Enterprise data governance.</strong> Organizations can set and enforce consistent data handling rules across all vendor relationships.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorTerms;
