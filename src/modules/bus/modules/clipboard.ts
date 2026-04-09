/**
 * Sovereign Bus — Clipboard Module
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

import { bus } from "@/modules/bus";
import {
  readClipboard,
  writeClipboard,
  getClipboardHistory,
} from "@/modules/sovereign-spaces/clipboard/clipboard-sync";

bus.register("clipboard/read", async () => {
  const content = await readClipboard();
  return { content };
});

bus.register("clipboard/write", async (params: { content: string }) => {
  await writeClipboard(params.content);
  return { success: true };
});

bus.register("clipboard/history", async () => {
  const history = getClipboardHistory();
  return { entries: history, count: history.length };
});
