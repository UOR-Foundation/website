/**
 * Canonical sources for the three UOR specifications.
 *
 * Single source of truth for every spec name, type, and example shown on the
 * marketing site. Every record links back to the published `uor-foundation`
 * Rust crate (the canonical implementation) and the `UOR-Framework` repository.
 *
 * Module mapping is verified against docs.rs at the pinned crate version:
 *   https://docs.rs/uor-foundation/0.3.0/uor_foundation/#module-structure
 *
 *   - kernel  — Immutable foundation: addressing, schema, operations
 *   - bridge  — Kernel-computed, user-consumed: queries, resolution, partitions, proofs
 *   - user    — Runtime declarations: types, morphisms, state
 *
 * Bumping the pinned version: update CRATE_VERSION + the three permalinks.
 */

export const CRATE_VERSION = "0.3.0";
const REPO = "https://github.com/UOR-Foundation/UOR-Framework";
const DOCS = `https://docs.rs/uor-foundation/${CRATE_VERSION}/uor_foundation`;

export type SpecId = "identity" | "object" | "resolution";
export type SpecStatus = "Stable" | "Draft";

export interface CanonicalSpec {
  id: SpecId;
  /** Public-facing spec name (OCI-style). */
  name: string;
  /** Short slug used in URLs and badges (e.g. "identity-spec"). */
  slug: string;
  /** The canonical Rust module this spec corresponds to (verified on docs.rs). */
  module: "kernel" | "bridge" | "user";
  /** One-line definition shown on cards. */
  oneLine: string;
  /** Status reflects what is published in the pinned crate version. */
  status: SpecStatus;
  crate: {
    name: "uor-foundation";
    version: string;
    cratesUrl: string;
    docsUrl: string;
  };
  repo: {
    url: string;
    /** Repo path that hosts the spec material for this module. */
    path: string;
  };
  /** In-repo TS mirror of the Rust types, when present. */
  tsMirror?: string;
}

export const canonicalSpecs: CanonicalSpec[] = [
  {
    id: "identity",
    name: "Identity Specification",
    slug: "identity-spec",
    module: "kernel",
    oneLine:
      "How a piece of data derives its permanent address from its content — the immutable foundation: addressing, schema, operations.",
    status: "Stable",
    crate: {
      name: "uor-foundation",
      version: CRATE_VERSION,
      cratesUrl: "https://crates.io/crates/uor-foundation",
      docsUrl: `${DOCS}/kernel/index.html`,
    },
    repo: {
      url: REPO,
      path: "foundation/src/kernel",
    },
    tsMirror: "src/types/uor-foundation/kernel/address.ts",
  },
  {
    id: "object",
    name: "Object Specification",
    slug: "object-spec",
    module: "user",
    oneLine:
      "How content, schema, and signatures are packaged into a portable, verifiable UOR Object — runtime declarations: types, morphisms, state.",
    status: "Draft",
    crate: {
      name: "uor-foundation",
      version: CRATE_VERSION,
      cratesUrl: "https://crates.io/crates/uor-foundation",
      docsUrl: `${DOCS}/user/index.html`,
    },
    repo: {
      url: REPO,
      path: "foundation/src/user",
    },
    tsMirror: "src/types/uor-foundation/user",
  },
  {
    id: "resolution",
    name: "Resolution Specification",
    slug: "resolution-spec",
    module: "bridge",
    oneLine:
      "How UOR Objects are queried, resolved, and proved across registries and peers — kernel-computed, user-consumed.",
    status: "Stable",
    crate: {
      name: "uor-foundation",
      version: CRATE_VERSION,
      cratesUrl: "https://crates.io/crates/uor-foundation",
      docsUrl: `${DOCS}/bridge/index.html`,
    },
    repo: {
      url: REPO,
      path: "foundation/src/bridge",
    },
    tsMirror: "src/types/uor-foundation/bridge",
  },
];

export const specById = (id: SpecId): CanonicalSpec =>
  canonicalSpecs.find((s) => s.id === id) as CanonicalSpec;

/**
 * Verbatim Quick Start snippet from the crate's published README on crates.io.
 * Source: https://crates.io/crates/uor-foundation (Quick start section).
 */
export const installSnippet = `[dependencies]
uor-foundation = "${CRATE_VERSION}"`;

/**
 * Verbatim HostTypes snippet from the crate's published documentation.
 * Source: https://docs.rs/uor-foundation/${CRATE_VERSION}/uor_foundation/#hosttypes-target-41-w10
 */
export const hostTypesSnippet = `use uor_foundation::{HostTypes, DefaultHostTypes};

// Use the canonical defaults: f64 / str / [u8].
type H = DefaultHostTypes;`;

/**
 * Verbatim principal data path from the crate's published documentation.
 * Source: https://docs.rs/uor-foundation/${CRATE_VERSION}/uor_foundation/#principal-data-path
 */
export const principalPathSnippet = ` host bytes  ──▶  impl Grounding<Map = …>  ──▶  Datum<L>   [W4: kind-typed]
                                                 │
                                                 ▼
 builder.validate_const() │ .validate()  ──▶  Validated<T, Phase>
                                                 │            [W2 + W13]
                                                 ▼
 pipeline::run::<T, P>(unit)  ──▶  Grounded<T>
                                      │            [W14]
                                      ▼
                           .triad() → Triad<L>     [W8]
                           .certificate()          [W11: Certified<C>]`;