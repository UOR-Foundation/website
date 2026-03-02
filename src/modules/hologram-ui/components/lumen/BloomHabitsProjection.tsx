/**
 * BloomHabitsProjection — Procedural Memory view in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Full projection wrapper for the HabitRing widget with
 * additional context about the cerebellum fast-path system.
 *
 * @module hologram-ui/components/lumen/BloomHabitsProjection
 */

import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import HabitRingWidget from "./HabitRingWidget";

export default function BloomHabitsProjection() {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto py-3 gap-3">
      <HabitRingWidget active />

      {/* Explanation card */}
      <div
        className="mx-4 rounded-xl px-4 py-3"
        style={{
          background: PP.canvasSubtle,
          border: `1px solid ${PP.bloomCardBorder}`,
        }}
      >
        <p
          style={{
            fontFamily: PP.font,
            fontSize: "11px",
            color: PP.textWhisper,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: PP.accent, fontWeight: 600 }}>Cerebellum Fast-Path</span>
          {" "}— Recurring reasoning patterns that produce high rewards are
          automatically detected and promoted to habit kernels. These compiled
          circuit templates execute in O(1) time, bypassing the full reasoning
          pipeline for learned routines.
        </p>
      </div>
    </div>
  );
}
