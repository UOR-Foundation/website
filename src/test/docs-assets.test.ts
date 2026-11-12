import { describe, expect, it } from "vitest";
import { agentDocs } from "../../vite.config";

describe("generated documentation assets", () => {
  it("emits valid asset contents after removing the containers page", async () => {
    const assets: { fileName: string; source: unknown }[] = [];
    const hook = agentDocs().generateBundle;
    const handler = typeof hook === "function" ? hook : hook?.handler;
    if (!handler) throw new Error("Documentation generation hook is missing");
    await handler.call({ emitFile: (asset: { fileName: string; source: unknown }) => { assets.push(asset); return asset.fileName; } } as never, {} as never, {} as never, false);

    expect(assets.some((asset) => asset.fileName === "docs/llms.txt")).toBe(true);
    expect(assets.some((asset) => asset.fileName === "docs/coming-from-containers.md")).toBe(false);
    expect(assets.length).toBeGreaterThan(20);
    for (const asset of assets) {
      expect(typeof asset.source === "string" || asset.source instanceof Uint8Array, asset.fileName).toBe(true);
    }
  }, 30000);
});