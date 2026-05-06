import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-prism-btc.jpg";

const ProjectPrismBtc = () => (
  <ProjectDetailLayout
    name="prism-btc"
    slug="prism-btc"
    category="Core Infrastructure"
    tagline="Bitcoin mining reframed as a UOR shape-preserving morphism search. Every block hash is a certified Grounded type, mining is a σ-convergence loop, and termination is formally proven in Lean 4."
    heroImage={heroImg}
    repoUrl="https://github.com/afflom/prism-btc"
    agentInstructions={[
      { action: "Build the workspace", detail: "Install Rust stable plus just, then run `just build` to compile all five crates: prism-btc-types, prism-btc-reduction, prism-btc, prism-btc-wasm, and prism-btc-node." },
      { action: "Run a mining round", detail: "Use `MiningRound::new(header, target).converge()` to obtain a `BlockCertificate<DigestProjectionMap>` — a sealed Grounded value that cannot be fabricated outside the pipeline." },
      { action: "Cross the wire boundary", detail: "Call `BlockCertificate::decode(&wire_bytes)` to ingest an 80-byte header. The decode/encode pair forms a `BinaryGroundingMap` ↔ `BinaryProjectionMap` zero-cost isomorphism." },
      { action: "Verify in Lean", detail: "Run `just verify` to build the Lean 4 proofs of ring identity, triadic coords, FreeRank protocol, shape-constraint monotonicity, and σ-convergence termination." },
    ]}
    sections={[
      {
        heading: "Why",
        content: (
          <>
            <p>
              Bitcoin's proof-of-work loop is one of the most-run programs on Earth, yet its types tell us nothing: a block hash is just a 32-byte array, indistinguishable from any other digest, and the mining loop trades correctness for raw speed.
            </p>
            <p>
              Without grounded types, anyone can hand a downstream service a forged hash, smuggle in a different projection, or confuse the wire bytes with the certified value. The UOR Foundation needed a real-world workload to prove that shape-preserving morphisms can carry production cryptography without giving up performance.
            </p>
          </>
        ),
      },
      {
        heading: "How",
        content: (
          <>
            <p>
              prism-btc encodes Bitcoin mining as two type-level morphisms over the UOR Foundation runtime: a σ-projection for SHA256d, and a wire-bytes isomorphism for serialization.
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Certify the shape.</strong> A const-validated CompileUnit is folded once per round through `pipeline::run_const`, minting a sealed `Grounded&lt;ConstrainedTypeInput, BlockHashTag&gt;` that no caller can fabricate.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Converge.</strong> The σ-convergence loop walks the finite nonce fiber, applying SHA256d as a `DigestProjectionMap` (Total, not Invertible) until a candidate satisfies the target.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Cross the boundary.</strong> The `Boundary` trait records the wire round-trip as a `BinaryGroundingMap` ↔ `BinaryProjectionMap` isomorphism, so 80-byte headers always re-run the full pipeline on decode.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Prove termination.</strong> Lean 4 proofs in `prism-btc-lean` formalize ring identity, triadic coords, FreeRank, shape-constraint monotonicity, and convergence over the finite nonce fiber.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "What",
        content: (
          <>
            <p>
              A five-crate Rust workspace plus a Lean 4 proof tree that mines real Bitcoin blocks through the UOR Foundation runtime: `MiningRound` and `BlockCertificate` as the public API, a wasm-bindgen wrapper for browsers, and a `prism-btc-node` CLI that integrates with Bitcoin Core via `getblocktemplate` and `submitblock`.
            </p>
            <p>
              The implementation has been demonstrated end-to-end against Bitcoin Core 28.0 on regtest: 107 blocks mined and accepted, with 6 coinbases (300 BTC) maturing to a spendable balance.
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
              <span><strong className="text-foreground">Production Bitcoin mining.</strong> A type-safe mining surface that integrates with `bitcoind` via standard RPCs while keeping every value crossing the boundary a certified type.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">UOR runtime validation.</strong> A real-world stress test of the UOR Foundation 0.3.1 morphism-kind taxonomy against a workload that runs billions of times per second.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">WebAssembly mining demos.</strong> Ship the same certified pipeline to the browser via `prism-btc-wasm` and `wasm-pack` for verifiable, in-page mining proofs.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Formal-methods education.</strong> A working example of how Lean 4 proofs and Rust newtypes can co-evolve to lock down a concrete, high-stakes protocol.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectPrismBtc;
