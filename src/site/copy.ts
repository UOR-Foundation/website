// Text only copy, safe to import from build config (no asset imports).
export const RIBBON = { text: "Prism SDK v0.4", tag: "Beta", cta: "Start building" };

/** The single canonical entry point for humans and agents. Every page and agent file reads it from here. */
export const START = {
  command: "npx prism-code@latest setup",
  line: "One command sets up Prism in your project, installs the Prism skill into your agent and registers two MCP servers: prism, which runs on your machine, and lexlean, the hosted verifier at https://mcp.uor.foundation/ that checks and proves LexLean models.",
  capabilities: [
    "Build, run and check self verifying Prism applications",
    "Give any file or object an identity computed from its content",
    "Replay an app's examples to confirm it behaves exactly as shipped",
    "Teach your coding agent the Prism SDK through the bundled skill",
  ],
  tools: [
    { name: "prism-code", what: "Runtime, command line and setup command. No account. Checks and proofs run on the hosted verifier unless the SDK image is on this machine." },
    { name: "prism MCP server", what: "prism-code mcp on stdio, on this machine. Setup registers it with every agent it finds." },
    { name: "lexlean MCP server", what: "The UOR Foundation hosted verifier at https://mcp.uor.foundation/. Setup registers it with every agent it finds. It receives source, see Hosted verifier." },
    { name: "Prism skill", what: "Instructions and verified examples for coding agents, added by setup." },
    { name: "Docs", what: "Plain text at /docs.md; every page has a .md twin." },
  ],
};

export const HERO = {
  lead: "Your Verifiable",
  rest: "Agentic Foundation",
  sub: "Build, ship and run self-verifying AI applications that just work. From edge to cloud, and beyond.",
  agentSkill: { label: "Try agent skill", command: START.command },
  steward: "Stewarded by an independent 501(c)(3).",
};


export const ABOUT = {
  label: "EXPLORE UOR Framework",
  orgLabel: "In production at",
  cta: { label: "Learn more", href: "/framework/" },
  title: "Unified virtual\naddressing standard\nfor all digital objects.",
  body: "Universal Object Reference (UOR) is an open standard for content–addressed decentralized identity of digital objects. Based on formal verification.",
  points: [
    {
      t: "Open by\ndefault",
      b: ["Papers, specs and code are public", "MIT or Apache 2.0, free to use", "Read it, run it, build on it"],
    },
    {
      t: "Identity from\ncontent",
      b: ["The address comes from the bytes", "Same data, same address, always", "One byte changed, a new address"],
    },
    {
      t: "No central\nauthority",
      b: ["No sign up, no permission needed", "No registry anyone can own", "No one can switch it off"],
    },
  ],
};

export const FRAMEWORK = {
  label: "Build with Prism SDK",
  title: "Agentic development\nthat just works.\nAnywhere.",
  line: "Prism is an open SDK that seamlessly enables you to build, ship and run self-verifying AI applications. From edge to cloud, and beyond.",
};
