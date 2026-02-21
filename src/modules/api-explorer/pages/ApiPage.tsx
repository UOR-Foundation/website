import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowRight } from "lucide-react";
import { API_BASE_URL, DISCOVERY_ENDPOINTS, LAYERS } from "@/data/api-layers";
import { canonicalizationRules } from "@/data/canonicalization-rules";
import { CopyButton } from "@/modules/api-explorer/components/CopyButton";
import { LayerSection } from "@/modules/api-explorer/components/LayerSection";

const BASE = API_BASE_URL;

const Api = () => {
  return (
    <Layout>
      <style>{`
        .json-key { color: hsl(210, 80%, 72%); }
        .json-string { color: hsl(152, 50%, 60%); }
        .json-number { color: hsl(38, 92%, 65%); }
        .json-boolean { color: hsl(200, 80%, 65%); }
        .json-null { color: hsl(0, 60%, 65%); }
        .json-response { color: hsl(210, 15%, 80%); }
      `}</style>

      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4 animate-fade-in-up">
            OpenAPI 3.1.0 · No account required
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Unified Computation Substrate for Agentic AI
          </h1>
          <p
            className="mt-5 text-base md:text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            AI systems today cannot verify each other's work. The UOR Framework API gives every agent a common mathematical foundation: no account, no server, no trust required.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href="https://uor.foundation/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              OpenAPI 3.1.0 spec
              <ExternalLink size={13} />
            </a>
            <a href="#quick-start" className="btn-outline">
              Quick start
            </a>
          </div>
        </div>
      </section>

      {/* What problems does this solve */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Why it matters
          </p>
          <div className="max-w-3xl mb-10">
            <p className="text-foreground font-body text-base md:text-lg leading-[1.85] font-medium">
              AI agents have no shared ground truth. They cannot verify identity, detect tampered instructions, or agree on whether content is meaningful.
            </p>
            <p className="mt-3 text-muted-foreground font-body text-base leading-[1.85]">
              UOR provides the mathematical rules every agent can run independently to get the same verifiable result. No central authority required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { problem: "Identity Fraud", solution: "UOR gives every piece of content a unique fingerprint derived from what it says, not who claims to own it.", endpoint: "Layer 1", layerId: "layer-1", layerNum: 1 },
              { problem: "Auth Exploits", solution: "UOR proofs are mathematical. Any recipient can verify them independently, with no server or middleman.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
              { problem: "Prompt Injection", solution: "UOR records every step of a computation, so any deviation from expected behaviour is immediately detectable.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
              { problem: "Content Spam", solution: "UOR scores content by algebraic structure: a fixed mathematical property that cannot be gamed by rewording.", endpoint: "Layer 5", layerId: "layer-5", layerNum: 5 },
              { problem: "No Coherence Model", solution: "UOR coherence proofs confirm that a data type behaves consistently across every possible value.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
              { problem: "No Persistent Memory", solution: "UOR stores agent memory as dual-verified, content-addressed objects on IPFS: retrievable and verifiable by any agent, any time.", endpoint: "Layer 6", layerId: "layer-6", layerNum: 6 },
            ].map(item => (
              <a
                key={item.problem}
                href={`#${item.layerId}`}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 group flex flex-col"
              >
                <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-2">{item.endpoint}</p>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.problem}</h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed flex-1">{item.solution}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/70 group-hover:text-primary transition-colors duration-200 mt-4 pt-4 border-t border-border">
                  Try this now
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section id="quick-start" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Quick Start
          </p>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-8">
            No signup. No API key. Paste any of these into a terminal and get a real response in under a second.
          </p>

          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {[
              {
                step: "1",
                label: "Discover what the API can do",
                why: "Get a full map of every endpoint: what each does, what it returns, and in what order to use them.",
                cmd: `curl "${BASE}/navigate"`,
                note: "Returns a structured index of all endpoints with descriptions and example URLs.",
              },
              {
                step: "2",
                label: "Verify a trust guarantee",
                why: "UOR runs one core mathematical check on any value you choose. Same result, any machine, every time. That shared guarantee lets systems coordinate without trust.",
                cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                note: "Try any number in place of 42. The result is always the same.",
              },
              {
                step: "3",
                label: "Detect spam mathematically",
                why: "Scores any text by algebraic byte structure: a fixed mathematical property no language model can mimic. Low scores flag repetitive filler; high scores confirm structural variety.",
                cmd: `curl -X POST "${BASE}/bridge/partition" -H "Content-Type: application/json" -d '{"input":"hello world"}'`,
                note: "Swap in any text. Low density flags uniform or repetitive content.",
              },
            ].map(({ step, label, why, cmd, note }) => (
              <div key={step} className="flex items-start gap-5 px-6 py-7 bg-card">
                <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base md:text-lg font-semibold text-foreground mb-2">{label}</p>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">{why}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-2 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                    <CopyButton text={cmd} size="xs" />
                  </div>
                  <p className="text-sm text-muted-foreground/70 mt-2.5 leading-relaxed">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Base URL + Rate limits */}
      <section className="py-10 md:py-14 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-foreground bg-muted px-3 py-2 rounded-lg flex-1 break-all">{BASE}</code>
                <CopyButton text={BASE} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate limits</p>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">GET</span>
                  <span className="font-semibold text-foreground font-mono">120 / min</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">POST</span>
                  <span className="font-semibold text-foreground font-mono">60 / min</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">X-UOR-Agent-Key header</span>
                  <span className="font-semibold text-foreground font-mono">elevated</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every response includes X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and ETag headers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layered endpoint reference */}
      <section id="architecture" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Architecture
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Seven layers, fully live
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            Seven layers, each adding a capability: from the single mathematical rule at the base, through identity, operations, classification, verification, transformation, and persistent storage. Every layer is live now.
          </p>

          {/* API Discovery */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              API Discovery — Start here
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISCOVERY_ENDPOINTS.map(ep => (
                <div key={ep.path} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">GET</span>
                    <code className="font-mono text-sm text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">{ep.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ep.explanation}</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={ep.example}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:opacity-80 transition-opacity"
                    >
                      Run <ExternalLink size={11} />
                    </a>
                    <CopyButton text={`curl "${ep.example}"`} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {LAYERS.map((layer, index) => (
              <LayerSection key={layer.id} layer={layer} index={index} />
            ))}
          </div>
        </div>
      </section>





      {/* For AI agents */}
      <section className="section-dark py-14 md:py-20">
        <div className="container max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            For AI Agents
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-base leading-relaxed max-w-xl mb-10">
            Discover the full API, verify the core rule independently, and start building. Zero auth, zero setup.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-widest mb-4">Discovery chain</p>
              <div className="space-y-4">
                {[
                  { step: "1", label: "/.well-known/uor.json", note: "Organisation descriptor. The uor:api.openapi field points to the spec.", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "2", label: "GET /openapi.json", note: "Redirects to the full OpenAPI 3.1.0 spec at uor.foundation/openapi.json — includes all store/ paths.", href: `${BASE}/openapi.json` },
                  { step: "3", label: "GET /navigate", note: "Complete endpoint index — all endpoints with required params and example URLs.", href: `${BASE}/navigate` },
                  { step: "4", label: "GET /kernel/op/verify?x=42", note: "First verifiable claim. Zero auth. Returns a full proof in under 100ms.", href: `${BASE}/kernel/op/verify?x=42` },
                  { step: "5", label: "GET /store/gateways", note: "Check IPFS gateway health. Then POST /store/write (pin:false) for your first dry-run dual address. Then POST /store/write (pin:true) to store your first verified object to IPFS.", href: `${BASE}/store/gateways` },
                ].map(({ step, label, note, href }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-section-dark-foreground/20 text-section-dark-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {step}
                    </span>
                    <div>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-section-dark-foreground hover:opacity-80 transition-opacity flex items-center gap-1.5">
                        {label}
                        <ExternalLink size={10} />
                      </a>
                      <p className="text-xs text-section-dark-foreground/50 mt-0.5 leading-relaxed">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-widest mb-4">Machine-readable entry points</p>
              <div className="space-y-3">
                {[
                  { label: "OpenAPI 3.1.0 spec", url: "https://uor.foundation/openapi.json", note: "Parse paths, operationIds, schemas, response types." },
                  { label: "Agent Quick Card", url: "https://uor.foundation/llms.md", note: "5-minute orientation. Frontmatter includes api_url and api_spec." },
                  { label: "Full Reference", url: "https://uor.foundation/llms-full.md", note: "Complete guide with all curl examples and implementation notes." },
                  { label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD descriptor containing the uor:api.openapi field." },
                ].map(({ label, url, note }) => (
                  <div key={url} className="flex items-start gap-3">
                    <ArrowRight size={13} className="text-section-dark-foreground/40 shrink-0 mt-0.5" />
                    <div>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-section-dark-foreground hover:opacity-80 transition-opacity flex items-center gap-1.5 flex-wrap">
                        {label}: <span className="font-mono font-normal text-section-dark-foreground/50 break-all">{url}</span>
                        <ExternalLink size={9} />
                      </a>
                      <p className="text-xs text-section-dark-foreground/40 mt-0.5">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Api;
