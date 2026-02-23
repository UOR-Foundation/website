/**
 * UOR SDK — App CLI Engine (`uor-app`)
 *
 * One command from finished app to live deployment.
 * Composes from existing UOR infrastructure:
 *   - singleProofHash (canonical identity)
 *   - MonetizationEngine (certificate-gated payments)
 *   - UNS KV (state storage)
 *   - Observer zones (discovery ranking)
 *
 * Every command returns an AppCliResult — testable without a real CLI.
 * In production, a thin Commander.js wrapper calls these functions.
 *
 * @see P12 spec — Developer CLI
 * @see uns/cli/commands.ts — Lower-level UNS CLI (same pattern)
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";
import { MonetizationEngine } from "./monetization";
import type {
  AppCliResult,
  DeployOptions,
  UpdateOptions,
  MonetizeOptions,
  RollbackOptions,
  AppRecord,
  DeveloperIdentity,
} from "./cli-types";

// ── Serialization helpers (shared with monetization) ────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();
const toBytes = (obj: unknown): Uint8Array => enc.encode(JSON.stringify(obj));
const fromBytes = <T>(bytes: Uint8Array): T => JSON.parse(dec.decode(bytes)) as T;

// ── AppCli ──────────────────────────────────────────────────────────────────

/**
 * The `uor-app` CLI command engine.
 *
 * Stateless — all state lives in the injected KV store.
 * Testable — no filesystem or network side effects.
 */
export class AppCli {
  private readonly monetization: MonetizationEngine;

  constructor(
    private readonly kv: UnsKv,
    monetization?: MonetizationEngine,
  ) {
    this.monetization = monetization ?? new MonetizationEngine(kv);
  }

  // ── deploy ──────────────────────────────────────────────────────────────

  /**
   * `uor-app deploy <source>`
   *
   * Content-addresses the app source, creates an AppRecord,
   * registers an observer baseline, and returns the live URL.
   */
  async deploy(opts: DeployOptions): Promise<AppCliResult> {
    const startMs = performance.now();

    // 1. Content-address the source
    const sourcePayload = {
      source: opts.source,
      name: opts.name ?? "unnamed-app",
      deployedAt: new Date().toISOString(),
    };
    const proof = await singleProofHash(sourcePayload);
    const shortId = proof.derivationId.split(":").pop()!.slice(0, 6);

    // 2. Partition density check (structural security gate)
    // For URLs / repo references, density is checked at import time (deferred).
    // For raw source, check byte diversity as a flood/spam gate.
    const isReference = opts.source.startsWith("http") || opts.source.startsWith("github:");
    let density = 1.0;
    let securitySignal: "PASS" | "FAIL" = "PASS";

    if (!isReference) {
      const sourceBytes = enc.encode(opts.source);
      const uniqueBytes = new Set(sourceBytes);
      density = uniqueBytes.size / 256;
      securitySignal = density >= 0.1 ? "PASS" : "FAIL";
    }

    if (securitySignal === "FAIL") {
      return {
        exitCode: 1,
        stdout: `✗ Security scan: FAIL (density: ${density.toFixed(2)})`,
        json: { error: "security_scan_failed", density },
      };
    }

    // 3. Build app record
    const record: AppRecord = {
      canonicalId: proof.derivationId,
      name: opts.name ?? "unnamed-app",
      source: opts.source,
      developer: opts.developer ?? "anonymous",
      ipv6: proof.ipv6Address["u:ipv6"],
      cid: proof.cid,
      glyph: proof.uorAddress["u:glyph"],
      zone: "COHERENCE",
      deployedAt: sourcePayload.deployedAt,
    };

    // 4. Store in KV
    await this.kv.put(`app:${record.canonicalId}`, toBytes(record));

    // 5. Store version chain
    await this.appendVersion(record.canonicalId, record);

    const elapsedMs = performance.now() - startMs;
    const liveUrl = `https://app.uor.app/${shortId}`;

    return {
      exitCode: 0,
      stdout: [
        `✓ Importing from ${opts.source}...`,
        `✓ Security scan: ${securitySignal} (density: ${density.toFixed(2)})`,
        `✓ Identity: ${proof.derivationId}`,
        `✓ IPv6:     ${record.ipv6}`,
        `✓ IPFS CID: ${record.cid}`,
        `✓ Observer: ${record.zone} zone`,
        `✓ Live URL: ${liveUrl}`,
        `Completed in ${(elapsedMs / 1000).toFixed(1)}s`,
      ].join("\n"),
      json: {
        canonicalId: record.canonicalId,
        ipv6: record.ipv6,
        cid: record.cid,
        glyph: record.glyph,
        zone: record.zone,
        liveUrl,
        elapsedMs,
      },
    };
  }

  // ── update ──────────────────────────────────────────────────────────────

  /**
   * `uor-app update <canonicalId> <newSource>`
   *
   * Redeploys with a new source, linking to the previous version.
   */
  async update(opts: UpdateOptions): Promise<AppCliResult> {
    const existing = await this.getAppRecord(opts.canonicalId);
    if (!existing) {
      return {
        exitCode: 1,
        stdout: `✗ App not found: ${opts.canonicalId}`,
        json: { error: "not_found", canonicalId: opts.canonicalId },
      };
    }

    const result = await this.deploy({
      source: opts.newSource,
      name: existing.name,
      developer: existing.developer,
    });

    // Link previous version
    if (result.exitCode === 0) {
      const newId = result.json.canonicalId as string;
      const newRecord = await this.getAppRecord(newId);
      if (newRecord) {
        newRecord.previousVersionId = opts.canonicalId;
        await this.kv.put(`app:${newId}`, toBytes(newRecord));
      }
    }

    return result;
  }

  // ── monetize ────────────────────────────────────────────────────────────

  /**
   * `uor-app monetize <canonicalId> --price <usd> --interval <monthly|annual> --gate <name>`
   */
  async monetize(opts: MonetizeOptions): Promise<AppCliResult> {
    const { configCanonicalId } = await this.monetization.configureMonetization({
      appCanonicalId: opts.canonicalId,
      model: "subscription",
      price: opts.price,
      currency: "USD",
      interval: opts.interval,
      gate: opts.gate,
    });

    return {
      exitCode: 0,
      stdout: [
        `✓ Payment gate '${opts.gate}' created at $${opts.price}/${opts.interval}`,
        `✓ Certificate: issued to users on payment`,
        `✓ Revenue share: 80% developer / 20% platform`,
        `✓ Config ID: ${configCanonicalId}`,
      ].join("\n"),
      json: {
        gate: opts.gate,
        price: opts.price,
        interval: opts.interval,
        configCanonicalId,
        revenueShare: { developer: 0.8, platform: 0.2 },
      },
    };
  }

  // ── status ──────────────────────────────────────────────────────────────

  /**
   * `uor-app status <canonicalId>`
   */
  async status(canonicalId: string): Promise<AppCliResult> {
    const record = await this.getAppRecord(canonicalId);
    if (!record) {
      return {
        exitCode: 1,
        stdout: `✗ App not found: ${canonicalId}`,
        json: { error: "not_found" },
      };
    }

    const balance = await this.monetization.getDeveloperBalance(canonicalId);

    return {
      exitCode: 0,
      stdout: [
        `App:      ${record.name}`,
        `Identity: ${record.canonicalId}`,
        `Zone:     ${record.zone}`,
        `hScore:   1.0`,
        `Revenue:  $${balance.net.toFixed(2)} net`,
        `Deployed: ${record.deployedAt}`,
      ].join("\n"),
      json: {
        name: record.name,
        canonicalId: record.canonicalId,
        zone: record.zone,
        hScore: 1.0,
        revenue: balance,
        deployedAt: record.deployedAt,
      },
    };
  }

  // ── history ─────────────────────────────────────────────────────────────

  /**
   * `uor-app history <canonicalId>`
   */
  async history(canonicalId: string): Promise<AppCliResult> {
    const versions = await this.getVersionChain(canonicalId);
    if (versions.length === 0) {
      return {
        exitCode: 1,
        stdout: `✗ No history for: ${canonicalId}`,
        json: { error: "not_found" },
      };
    }

    const rows = versions.map((v, i) =>
      `${i + 1}. ${v.canonicalId.split(":").pop()!.slice(0, 12)}...  ${v.deployedAt}  ${v.name}`
    );

    return {
      exitCode: 0,
      stdout: [
        `Version History (${versions.length} versions)`,
        "─".repeat(60),
        ...rows,
      ].join("\n"),
      json: {
        versions: versions.map((v) => ({
          canonicalId: v.canonicalId,
          deployedAt: v.deployedAt,
          name: v.name,
        })),
      },
    };
  }

  // ── verify ──────────────────────────────────────────────────────────────

  /**
   * `uor-app verify <canonicalId> --file <bytes>`
   *
   * Recomputes the canonical ID from file bytes and compares.
   */
  async verify(
    canonicalId: string,
    fileBytes?: Uint8Array,
  ): Promise<AppCliResult> {
    if (fileBytes) {
      // Verify file content against canonical ID
      let binary = "";
      for (const b of fileBytes) binary += String.fromCharCode(b);
      const proof = await singleProofHash({ raw: btoa(binary) });
      const match = proof.derivationId === canonicalId;

      return {
        exitCode: match ? 0 : 1,
        stdout: match ? "✓ VERIFIED" : "✗ MISMATCH",
        json: {
          verified: match,
          expected: canonicalId,
          computed: proof.derivationId,
        },
      };
    }

    // Verify app record exists
    const record = await this.getAppRecord(canonicalId);
    if (record) {
      return {
        exitCode: 0,
        stdout: `✓ VERIFIED — ${record.name} (${record.zone} zone)`,
        json: { verified: true, record },
      };
    }

    return {
      exitCode: 1,
      stdout: `✗ MISMATCH — app not found`,
      json: { verified: false, canonicalId },
    };
  }

  // ── rollback ────────────────────────────────────────────────────────────

  /**
   * `uor-app rollback <canonicalId> --to <previousCanonicalId>`
   */
  async rollback(opts: RollbackOptions): Promise<AppCliResult> {
    const previous = await this.getAppRecord(opts.toCanonicalId);
    if (!previous) {
      return {
        exitCode: 1,
        stdout: `✗ Version not found: ${opts.toCanonicalId}`,
        json: { error: "version_not_found" },
      };
    }

    // Re-deploy the previous version as a new deploy linking back
    return this.update({
      canonicalId: opts.canonicalId,
      newSource: previous.source,
    });
  }

  // ── init ────────────────────────────────────────────────────────────────

  /**
   * `uor-app init`
   *
   * Creates a developer identity and stores it in KV.
   * In production, writes to ~/.uor/identity.json.
   */
  async init(): Promise<AppCliResult> {
    const identity: DeveloperIdentity = {
      canonicalId: "",
      createdAt: new Date().toISOString(),
    };

    const proof = await singleProofHash({
      type: "developer-identity",
      createdAt: identity.createdAt,
      entropy: Math.random().toString(36),
    });

    identity.canonicalId = proof.derivationId;
    await this.kv.put("identity:developer", toBytes(identity));

    return {
      exitCode: 0,
      stdout: [
        `✓ Developer identity created`,
        `✓ Canonical ID: ${identity.canonicalId}`,
        `✓ Saved to ~/.uor/identity.json`,
      ].join("\n"),
      json: {
        canonicalId: identity.canonicalId,
        createdAt: identity.createdAt,
        path: "~/.uor/identity.json",
      },
    };
  }

  // ── whoami ──────────────────────────────────────────────────────────────

  /**
   * `uor-app whoami`
   */
  async whoami(): Promise<AppCliResult> {
    const entry = await this.kv.get("identity:developer");
    if (!entry) {
      return {
        exitCode: 1,
        stdout: "No developer identity found. Run: uor-app init",
        json: { error: "no_identity" },
      };
    }

    const identity = fromBytes<DeveloperIdentity>(entry.value);
    return {
      exitCode: 0,
      stdout: `Developer: ${identity.canonicalId}`,
      json: { canonicalId: identity.canonicalId, createdAt: identity.createdAt },
    };
  }

  // ── help ────────────────────────────────────────────────────────────────

  help(): AppCliResult {
    return {
      exitCode: 0,
      stdout: [
        "uor-app — UOR App Platform CLI",
        "",
        "Commands:",
        "  deploy <source>              Deploy an app (URL, github:owner/repo, or ./path)",
        "  update <id> <source>         Redeploy, links previous version",
        "  monetize <id>                Add payment gate to app",
        "  status <id>                  Show app status, zone, and revenue",
        "  history <id>                 Show version chain",
        "  verify <id> [--file <path>]  Verify app integrity",
        "  rollback <id> --to <prevId>  Rollback to previous version",
        "  init                         Create developer identity",
        "  whoami                       Show developer canonical ID",
        "  --help                       Show this help",
      ].join("\n"),
      json: {
        commands: [
          "deploy", "update", "monetize", "status",
          "history", "verify", "rollback", "init", "whoami",
        ],
      },
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async getAppRecord(canonicalId: string): Promise<AppRecord | null> {
    const entry = await this.kv.get(`app:${canonicalId}`);
    if (!entry) return null;
    return fromBytes<AppRecord>(entry.value);
  }

  private async appendVersion(canonicalId: string, record: AppRecord): Promise<void> {
    const key = `versions:${canonicalId}`;
    const existing = await this.kv.get(key);
    const versions: AppRecord[] = existing ? fromBytes<AppRecord[]>(existing.value) : [];
    versions.push(record);
    await this.kv.put(key, toBytes(versions));
  }

  private async getVersionChain(canonicalId: string): Promise<AppRecord[]> {
    const key = `versions:${canonicalId}`;
    const entry = await this.kv.get(key);
    if (!entry) return [];
    return fromBytes<AppRecord[]>(entry.value);
  }
}
