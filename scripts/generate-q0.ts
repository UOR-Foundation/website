/**
 * Q0 Static Graph Generator — run with: npx tsx scripts/generate-q0.ts
 *
 * Generates public/uor_q0.jsonld from the Q0 graph builder.
 * This script is also used in CI to keep the static file up-to-date.
 */

import { buildQ0Graph } from "../src/lib/q0-graph-builder";

async function main() {
  const graph = await buildQ0Graph();
  const nodeCount = graph["@graph"].length;
  const json = JSON.stringify(graph, null, 2);

  // Write to stdout for piping, or to file
  const outPath = "public/uor_q0.jsonld";
  const fs = await import("fs");
  fs.writeFileSync(outPath, json, "utf-8");
  console.log(`Written: ${outPath} (${nodeCount} nodes, ${json.length} bytes)`);
}

main().catch(console.error);
