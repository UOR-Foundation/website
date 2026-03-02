/**
 * BloomMirrorProjection — Mirror Protocol view in the bloom
 * ═══════════════════════════════════════════════════════════
 *
 * Full projection wrapper for the MirrorWeb widget with
 * explanation of inter-agent coherence modeling.
 *
 * @module hologram-ui/components/lumen/BloomMirrorProjection
 */

import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import MirrorWebWidget from "./MirrorWebWidget";

export default function BloomMirrorProjection() {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto py-3 gap-3">
      <MirrorWebWidget />

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
          <span style={{ color: PP.accent, fontWeight: 600 }}>Mirror Neurons</span>
          {" "}— Agents maintain predictive models of neighboring agents'
          coherence states. Empathy is derived from the inverse of prediction
          error. When empathy exceeds the threshold, procedural habits and
          compiled circuits are shared across bonds, creating a network effect
          where reasoning patterns learned by one instance transfer to others.
        </p>
      </div>
    </div>
  );
}
