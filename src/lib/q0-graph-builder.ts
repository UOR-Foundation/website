/**
 * Q0 Instance Graph Builder — generates uor_q0.jsonld
 *
 * Materialises all 256 ring elements of Z/256Z as Datum individuals
 * with full content-addressed IRIs, triadic coordinates, and ring links.
 *
 * Also includes 6 canonical derivation examples, a critical identity proof,
 * and a partition node.
 *
 * Port of the Rust binary `uor-q0` (clients/src/bin/q0.rs) to TypeScript.
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

function datumIri(v: number): string {
  const codepoint = 0x2800 + (v & 0xff);
  return `https://uor.foundation/u/U${codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function stratum(v: number): number {
  let n = v & 0xff;
  let count = 0;
  while (n) { count += n & 1; n >>= 1; }
  return count;
}

function spectrum(v: number): string {
  const bits: number[] = [];
  for (let i = 0; i < 8; i++) {
    if ((v >> i) & 1) bits.push(i);
  }
  return bits.join(",");
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function derivationId(canonicalTerm: string): Promise<string> {
  const hash = await sha256hex(canonicalTerm);
  return `urn:uor:derivation:sha256:${hash}`;
}

function brailleGlyph(v: number): string {
  return String.fromCodePoint(0x2800 + (v & 0xff));
}

// ── Graph builder ───────────────────────────────────────────────────────────

export interface Q0Graph {
  "@context": Record<string, string>;
  "@graph": Record<string, unknown>[];
}

export async function buildQ0Graph(): Promise<Q0Graph> {
  const graph: Record<string, unknown>[] = [];

  // Ring node
  graph.push({
    "@id": "https://uor.foundation/instance/q0/ring",
    "@type": ["owl:NamedIndividual", "schema:Ring"],
    "schema:ringQuantum": 8,
    "schema:modulus": 256,
    "schema:generator": { "@id": "https://uor.foundation/op/neg" },
    "schema:negation": { "@id": "https://uor.foundation/op/neg" },
    "schema:complement": { "@id": "https://uor.foundation/op/bnot" },
  });

  // 256 Datum nodes
  for (let v = 0; v <= 255; v++) {
    graph.push({
      "@id": datumIri(v),
      "@type": ["owl:NamedIndividual", "schema:Datum"],
      "schema:ringQuantum": 8,
      "schema:value": v,
      "schema:glyph": brailleGlyph(v),
      "schema:stratum": stratum(v),
      "schema:spectrum": spectrum(v),
      "u:canonicalIri": datumIri(v),
      "schema:succ": { "@id": datumIri((v + 1) & 0xff) },
      "schema:pred": { "@id": datumIri((v - 1 + 256) & 0xff) },
      "schema:neg": { "@id": datumIri((-v + 256) & 0xff) },
      "schema:bnot": { "@id": datumIri(v ^ 0xff) },
    });
  }

  // 6 canonical derivation examples
  const examples: [string, number][] = [
    ["xor(0x55,0xaa)", 0x55 ^ 0xaa],
    ["xor(0xaa,0x55)", 0xaa ^ 0x55], // same canonical form → same derivation_id after AC-normalisation
    ["neg(0x01)", (-0x01 + 256) & 0xff],
    ["bnot(0x00)", 0x00 ^ 0xff],
    ["xor(0,0)", 0],
    ["neg(bnot(0x2a))", (-(0x2a ^ 0xff) + 256) & 0xff],
  ];

  for (let i = 0; i < examples.length; i++) {
    const [term, result] = examples[i];
    // AC-normalise: for commutative ops, sort args ascending
    let canonicalTerm = term;
    const xorMatch = term.match(/^xor\((0x[0-9a-f]+),(0x[0-9a-f]+)\)$/i);
    if (xorMatch) {
      const a = parseInt(xorMatch[1], 16);
      const b = parseInt(xorMatch[2], 16);
      const sorted = [a, b].sort((x, y) => x - y);
      canonicalTerm = `xor(0x${sorted[0].toString(16)},0x${sorted[1].toString(16)})`;
    }

    const dId = await derivationId(canonicalTerm);
    graph.push({
      "@id": `https://uor.foundation/instance/q0/derivation-${i}`,
      "@type": ["owl:NamedIndividual", "derivation:Derivation"],
      "derivation:derivationId": dId,
      "derivation:resultIri": datumIri(result),
      "derivation:originalTerm": { "@type": "schema:Term", "value": term },
      "derivation:canonicalTerm": { "@type": "schema:Term", "value": canonicalTerm },
      "derivation:stepCount": 1,
    });
  }

  // Critical identity proof
  graph.push({
    "@id": "https://uor.foundation/instance/q0/proof-critical-id",
    "@type": ["owl:NamedIndividual", "proof:CriticalIdentityProof", "proof:Proof"],
    "proof:verified": true,
    "proof:quantum": 8,
    "proof:provesIdentity": { "@id": "https://uor.foundation/op/criticalIdentity" },
    "proof:criticalIdentity": "neg(bnot(x)) = succ(x) for all x in Z/256Z",
  });

  // Partition node
  graph.push({
    "@id": "https://uor.foundation/instance/q0/partition",
    "@type": ["owl:NamedIndividual", "partition:Partition"],
    "schema:ringQuantum": 8,
    "partition:cardinality": 256,
  });

  return {
    "@context": {
      "owl": "http://www.w3.org/2002/07/owl#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "schema": "https://uor.foundation/schema/",
      "op": "https://uor.foundation/op/",
      "u": "https://uor.foundation/u/",
      "derivation": "https://uor.foundation/derivation/",
      "proof": "https://uor.foundation/proof/",
      "partition": "https://uor.foundation/partition/",
    },
    "@graph": graph,
  };
}
