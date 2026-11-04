// Checks the skill a client would install from the live site after a deploy:
// the v2 index digest matches the served SKILL.md bytes, the v1 copy is byte identical,
// and, when given, the live digest equals the one this deploy built.
// A mismatch matters because the skills CLI falls back to the undigested v1 copy without saying so.
// GitHub Pages caches each file for up to 10 minutes, so it retries before failing.
// Usage: node scripts/check-live-skill.mjs [origin] [expected-digest]
import { createHash } from "node:crypto";

const [origin = "https://uor.foundation", expected = ""] = process.argv.slice(2);
const tries = Number(process.env.TRIES ?? 24);
const waitMs = Number(process.env.WAIT_MS ?? 30_000);

async function get(url) {
  const r = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error(`${url} answered ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function problems() {
  const indexUrl = new URL("/.well-known/agent-skills/index.json", origin);
  const index = JSON.parse((await get(indexUrl)).toString("utf8"));
  const found = [];
  for (const skill of index.skills ?? []) {
    const v2 = await get(new URL(skill.url, indexUrl));
    const actual = `sha256:${createHash("sha256").update(v2).digest("hex")}`;
    if (actual !== skill.digest) found.push(`${skill.name}: index says ${skill.digest}, SKILL.md bytes are ${actual}`);
    if (expected && skill.digest !== expected) found.push(`${skill.name}: live digest ${skill.digest}, this build ${expected}`);
    const v1 = await get(new URL(`/.well-known/skills/${skill.name}/SKILL.md`, origin));
    if (!v1.equals(v2)) found.push(`${skill.name}: v1 and v2 SKILL.md differ`);
  }
  if (!found.length && !(index.skills ?? []).length) found.push("index lists no skills");
  return found;
}

for (let attempt = 1; ; attempt++) {
  let found;
  try {
    found = await problems();
  } catch (error) {
    found = [String(error.message ?? error)];
  }
  if (!found.length) {
    console.log(`live skill consistent at ${origin}${expected ? ` (${expected})` : ""}`);
    break;
  }
  console.log(`attempt ${attempt}/${tries}:\n  ${found.join("\n  ")}`);
  if (attempt >= tries) process.exit(1);
  await new Promise((done) => setTimeout(done, waitMs));
}
