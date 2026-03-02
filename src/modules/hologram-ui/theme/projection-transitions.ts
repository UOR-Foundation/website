/**
 * Projection Transitions — Unified Motion Constants
 * ═══════════════════════════════════════════════════
 *
 * Single source of truth for all Hologram OS interaction timing.
 * Every panel open, frame switch, and overlay reveal uses these
 * values to create a unified, coherent motion language.
 *
 * Design principles:
 *   1. Snappy — interactions feel instant (≤280ms for primary actions)
 *   2. GPU-promoted — translate3d and opacity only, no layout triggers
 *   3. Unified easing — one curve family for the entire OS
 *   4. Layered timing — faster enter, slightly faster exit
 */

/** Primary interaction curve — organic ease-out with gentle deceleration */
export const EASE_PROJECT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Exit curve — balanced departure, not abrupt */
export const EASE_DISMISS = "cubic-bezier(0.2, 0.8, 0.4, 1)";

/** Micro interaction curve — for hovers, toggles, small state changes */
export const EASE_MICRO = "cubic-bezier(0.25, 0.1, 0.25, 1)";

/** Panel projection (sidebar panels, chat) — harmonious, balanced slide */
export const DURATION_PROJECT_MS = 340;

/** Overlay reveal (legal panel, modals) — slightly longer for presence */
export const DURATION_OVERLAY_MS = 400;

/** Backdrop fade — faster than content to feel responsive */
export const DURATION_BACKDROP_MS = 260;

/** Desktop frame switch — elegant peel */
export const DURATION_FRAME_MS = 1000;

/** Flyout/popover — snappiest */
export const DURATION_FLYOUT_MS = 160;

/** Micro transitions (hover, toggle) */
export const DURATION_MICRO_MS = 150;

// ── Composite CSS transition strings ──────────────────────────────

/** Standard panel projection transition (open) */
export const TRANSITION_PROJECT_IN = `transform ${DURATION_PROJECT_MS}ms ${EASE_PROJECT}, opacity ${Math.round(DURATION_PROJECT_MS * 0.6)}ms ${EASE_PROJECT}`;

/** Standard panel projection transition (close) */
export const TRANSITION_PROJECT_OUT = `transform ${DURATION_PROJECT_MS}ms ${EASE_DISMISS}, opacity ${Math.round(DURATION_PROJECT_MS * 0.4)}ms ease-out`;

/** Overlay slide transition */
export const TRANSITION_OVERLAY = `transform ${DURATION_OVERLAY_MS}ms ${EASE_PROJECT}, opacity ${DURATION_BACKDROP_MS}ms ${EASE_PROJECT}`;

/** Backdrop transition */
export const TRANSITION_BACKDROP = `opacity ${DURATION_BACKDROP_MS}ms ease-out`;
