// Diagrams for blog posts: HTML for the page, plain text for the .md twin. Referenced by <!-- figure:key --> markers.
type Fig = { html: string; md: string };
const node = (t: string, s = "", cls = "") => `<div class="bl-node ${cls}"><b>${t}</b>${s ? `<span>${s}</span>` : ""}</div>`;

export const FIGURES: Record<string, Fig> = {
  projections: {
    html: `<figure class="bl-fig"><div class="bl-fig-row">${node("LexLean spec", "the one source, proved in Lean", "bl-src")}<div class="bl-arrow">→</div><div class="bl-fig-col">${node("Code", "Rust crate, Wasm")}${node("Interface", "the app's screens")}${node("Proof", "checked by Lean")}${node("Fingerprint", "identity from content")}</div></div><figcaption>One spec. Everything else is a projection of it.</figcaption></figure>`,
    md: "```text\nLexLean spec (proved in Lean)\n  -> Code (Rust crate, Wasm)\n  -> Interface (the app's screens)\n  -> Proof (checked by Lean)\n  -> Fingerprint (identity from content)\n```",
  },
  editors: {
    html: `<figure class="bl-fig"><div class="bl-fig-grid3">${node("AI agent", "writes and edits")}<div class="bl-arrow bl-ok">✓ edits</div>${node("Spec", "the only thing anyone changes", "bl-src")}${node("AI agent", "")}<div class="bl-arrow bl-no">✕ never</div>${node("Code", "generated, never hand edited", "bl-off")}</div><figcaption>The agent works on the spec. Prism regenerates the code.</figcaption></figure>`,
    md: "```text\nAI agent --edits--> Spec\nAI agent --never--> Code\nSpec --generates--> Code\n```",
  },
  machines: {
    html: `<figure class="bl-fig"><div class="bl-fig-grid3">${["Phone at the edge", "Laptop", "Cloud server"].map((m) => node(m, "same spec → same bytes → same fingerprint")).join("")}</div><figcaption>The result does not depend on where it is built or run.</figcaption></figure>`,
    md: "```text\nPhone at the edge : same spec -> same bytes -> same fingerprint\nLaptop            : same spec -> same bytes -> same fingerprint\nCloud server      : same spec -> same bytes -> same fingerprint\n```",
  },
};

export const applyFigures = (s: string, fmt: "html" | "md") =>
  s.replace(/<!-- figure:(\w+) -->/g, (m, k) => (FIGURES[k] ? FIGURES[k][fmt] : m));
