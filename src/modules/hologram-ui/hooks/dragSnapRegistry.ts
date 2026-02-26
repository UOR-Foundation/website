/**
 * DragSnapRegistry — Shared registry for draggable element snap alignment
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Each draggable element registers its bounding rect. During drag, the
 * active element checks alignment with all others and snaps when within
 * a threshold. Visual guide lines are emitted for the overlay.
 */

export interface SnapRect {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: "x" | "y";
  position: number; // px from viewport edge
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
  snappedX: boolean;
  snappedY: boolean;
}

const SNAP_THRESHOLD = 8; // px proximity to trigger snap

// Global mutable registry (shared across all hook instances)
const registry = new Map<string, SnapRect>();

export function registerRect(key: string, rect: SnapRect) {
  registry.set(key, rect);
}

export function unregisterRect(key: string) {
  registry.delete(key);
}

/**
 * Given a dragging element's proposed position and size, check alignment
 * with all other registered elements and return snapped coords + guides.
 */
export function snapToOthers(
  activeKey: string,
  proposedX: number,
  proposedY: number,
  width: number,
  height: number,
): SnapResult {
  const guides: SnapGuide[] = [];
  let x = proposedX;
  let y = proposedY;
  let snappedX = false;
  let snappedY = false;

  // Edges and center of the active element
  const aLeft = proposedX;
  const aRight = proposedX + width;
  const aCenterX = proposedX + width / 2;
  const aTop = proposedY;
  const aBottom = proposedY + height;
  const aCenterY = proposedY + height / 2;

  // Also snap to viewport center
  const vCenterX = window.innerWidth / 2;
  const vCenterY = window.innerHeight / 2;

  // Check viewport center
  if (Math.abs(aCenterX - vCenterX) < SNAP_THRESHOLD) {
    x = vCenterX - width / 2;
    snappedX = true;
    guides.push({ axis: "x", position: vCenterX });
  }
  if (Math.abs(aCenterY - vCenterY) < SNAP_THRESHOLD) {
    y = vCenterY - height / 2;
    snappedY = true;
    guides.push({ axis: "y", position: vCenterY });
  }

  for (const [key, rect] of registry) {
    if (key === activeKey) continue;

    const bLeft = rect.x;
    const bRight = rect.x + rect.width;
    const bCenterX = rect.x + rect.width / 2;
    const bTop = rect.y;
    const bBottom = rect.y + rect.height;
    const bCenterY = rect.y + rect.height / 2;

    // X-axis alignment checks (left-left, right-right, center-center, left-right, right-left)
    if (!snappedX) {
      const xChecks = [
        { a: aLeft, b: bLeft, snap: bLeft },
        { a: aRight, b: bRight, snap: bRight - width },
        { a: aCenterX, b: bCenterX, snap: bCenterX - width / 2 },
        { a: aLeft, b: bRight, snap: bRight },
        { a: aRight, b: bLeft, snap: bLeft - width },
      ];
      for (const check of xChecks) {
        if (Math.abs(check.a - check.b) < SNAP_THRESHOLD) {
          x = check.snap;
          snappedX = true;
          guides.push({ axis: "x", position: check.b });
          break;
        }
      }
    }

    // Y-axis alignment checks (top-top, bottom-bottom, center-center, top-bottom, bottom-top)
    if (!snappedY) {
      const yChecks = [
        { a: aTop, b: bTop, snap: bTop },
        { a: aBottom, b: bBottom, snap: bBottom - height },
        { a: aCenterY, b: bCenterY, snap: bCenterY - height / 2 },
        { a: aTop, b: bBottom, snap: bBottom },
        { a: aBottom, b: bTop, snap: bTop - height },
      ];
      for (const check of yChecks) {
        if (Math.abs(check.a - check.b) < SNAP_THRESHOLD) {
          y = check.snap;
          snappedY = true;
          guides.push({ axis: "y", position: check.b });
          break;
        }
      }
    }
  }

  return { x, y, guides, snappedX, snappedY };
}
