/**
 * Hologram OS Module — Public API
 * ═══════════════════════════════
 *
 * The kernel-projected hologram experience.
 * Everything emanates from the Q-Linux kernel.
 *
 * @module hologram-os
 */

// Projection Engine — the kernel → visual bridge
export {
  KernelProjector,
  getKernelProjector,
  type ProjectionFrame,
  type BootEvent,
  type PanelProjection,
  type ProcessProjection,
  type ObservableProjection,
  type TypographyProjection,
  type PaletteProjection,
  type KernelConfig,
  type WidgetType,
  type WidgetProcess,
  type PanelId,
  type DesktopMode,
  type RewardProjection,
  type RewardSignal,
  type EpistemicGrade,
  type RewardCoherenceSnapshot,
} from "./projection-engine";

// Surface Adapter — kernel frames → browser DOM
export {
  BrowserSurfaceAdapter,
  getBrowserAdapter,
} from "./surface-adapter";

// React Hooks
export { useKernel, type UseKernelResult } from "./hooks/useKernel";
export { useCoherence, type CoherenceState } from "./hooks/useCoherence";

// Runtime (legacy v2 bridge)
export {
  createPanel,
  groupByAxis,
  createAttestation,
  createHologramState,
  type Panel,
  type Attestation,
  type HologramState,
} from "./runtime";
