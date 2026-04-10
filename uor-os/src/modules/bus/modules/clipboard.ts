/**
 * Service Mesh — Clipboard Module
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Bus operations for cross-device clipboard sync.
 *
 * Operations:
 *   clipboard/read   — Read current clipboard
 *   clipboard/write  — Write to clipboard
 *   clipboard/history — Get clipboard history
 *
 * @layer bus/modules
 */

import { register } from "../registry";

register({
  ns: "clipboard",
  label: "Cross-Device Clipboard",
  layer: 2,
  operations: {
    read: {
      handler: async () => {
        const { readClipboard } = await import("@/modules/sovereign-spaces/clipboard/clipboard-sync");
        const content = await readClipboard();
        return { content };
      },
      description: "Read current clipboard contents",
    },
    write: {
      handler: async (params: any) => {
        const { writeClipboard } = await import("@/modules/sovereign-spaces/clipboard/clipboard-sync");
        await writeClipboard(params?.content ?? "");
        return { success: true };
      },
      description: "Write text to clipboard",
      paramsSchema: { content: "string" },
    },
    history: {
      handler: async () => {
        const { getClipboardHistory } = await import("@/modules/sovereign-spaces/clipboard/clipboard-sync");
        const entries = getClipboardHistory();
        return { entries, count: entries.length };
      },
      description: "Get clipboard history for this session",
    },
  },
});
