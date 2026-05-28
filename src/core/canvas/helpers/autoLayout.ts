import type { AxisSizing } from '../types';

function toFrameSizingMode(mode: 'FIXED' | 'HUG' | 'AUTO'): 'FIXED' | 'AUTO' {
  if (mode === 'HUG') {
    return 'AUTO';
  }
  return mode;
}

export interface OnePxMasterViolation {
  kind: 'one-px-master';
  frameName: string;
  width: number;
  height: number;
  childCount: number;
}

export interface CollapsedAxisViolation {
  kind: 'collapsed-axis';
  frameName: string;
  axis: 'width' | 'height' | 'both';
  width: number;
  height: number;
  childCount: number;
}

export interface HugFrameOptions {
  name?: string;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  width: number;
  height?: number;
}

/** Fixed-size rectangle helper — preview modules avoid inline `resize(`. */
export function resizeRect(rect: RectangleNode, w: number, h: number): void {
  rect.resize(w, h);
}

/**
 * §0.10 / `03-auto-layout-invariants.md` §10.1 — resize first, then assign sizing modes.
 * `figma.resize()` resets both modes to FIXED; this helper restores the intended pair after resize.
 */
export function resizeThenApplySizing(
  frame: FrameNode,
  w: number,
  h: number,
  sizing: AxisSizing,
): void {
  frame.resize(w, h);
  frame.primaryAxisSizingMode = toFrameSizingMode(sizing.primaryAxisSizingMode);
  frame.counterAxisSizingMode = toFrameSizingMode(sizing.counterAxisSizingMode);
}

/**
 * §0.1 — create a frame with Hug on the height axis configured before resize.
 */
export function createHugFrame(opts: HugFrameOptions): FrameNode {
  const frame = figma.createFrame();
  const layoutMode = opts.layoutMode !== undefined ? opts.layoutMode : 'VERTICAL';
  frame.layoutMode = layoutMode;
  let primaryMode: 'FIXED' | 'AUTO';
  let counterMode: 'FIXED' | 'AUTO';
  if (layoutMode === 'HORIZONTAL') {
    primaryMode = 'FIXED';
    counterMode = 'AUTO';
  } else {
    primaryMode = 'AUTO';
    counterMode = 'FIXED';
  }
  frame.layoutSizingVertical = 'HUG';
  const height = opts.height !== undefined ? opts.height : 1;
  frame.resize(opts.width, height);
  // figma.resize() resets both sizing modes to FIXED — re-apply Hug axes (§0.1).
  frame.primaryAxisSizingMode = primaryMode;
  frame.counterAxisSizingMode = counterMode;
  if (opts.name !== undefined && opts.name !== '') {
    frame.name = opts.name;
  }
  frame.fills = [];
  return frame;
}

/**
 * Re-apply Hug after `appendChild` (mirrors `_lib.js` `rehugCell` / `rehugRow`).
 */
export function reassertHug(frame: FrameNode, axis?: 'vertical' | 'horizontal' | 'both'): void {
  const which = axis !== undefined ? axis : 'both';
  if (frame.layoutMode === 'HORIZONTAL') {
    if (which === 'vertical' || which === 'both') {
      frame.counterAxisSizingMode = 'AUTO';
    }
    if (which === 'horizontal' || which === 'both') {
      frame.primaryAxisSizingMode = 'FIXED';
    }
  } else if (frame.layoutMode === 'VERTICAL') {
    if (which === 'vertical' || which === 'both') {
      frame.primaryAxisSizingMode = 'AUTO';
    }
    if (which === 'horizontal' || which === 'both') {
      frame.counterAxisSizingMode = 'FIXED';
    }
  }
  frame.layoutSizingVertical = 'HUG';
}

/**
 * §3.1.2 — STRETCH on parent axis align items collapses table geometry.
 */
export function assertValidAxisAlign(parent: FrameNode): void {
  const primaryAlign = parent.primaryAxisAlignItems as string;
  if (primaryAlign === 'STRETCH') {
    throw new Error(
      `assertValidAxisAlign: primaryAxisAlignItems must not be STRETCH on "${parent.name}"`,
    );
  }
  const counterAlign = parent.counterAxisAlignItems as string;
  if (counterAlign === 'STRETCH') {
    throw new Error(
      `assertValidAxisAlign: counterAxisAlignItems must not be STRETCH on "${parent.name}"`,
    );
  }
}

/**
 * FR-SCAF-7 / `14-audit.md` — returns a violation object for audit; does not throw.
 */
export function assertNoOnePxMaster(frame: FrameNode): OnePxMasterViolation | null {
  if (frame.width <= 40) {
    return null;
  }
  if (frame.height > 2) {
    return null;
  }
  if (frame.children.length === 0) {
    return null;
  }
  return {
    kind: 'one-px-master',
    frameName: frame.name,
    width: frame.width,
    height: frame.height,
    childCount: frame.children.length,
  };
}

/**
 * BUG-S5-002 — `assertNoOnePxMaster` only catches the height collapse on COMPONENT masters
 * (width > 40, height ≤ 2). When a `doc/component/*` section is built via `resize(1,1)` and
 * then Hug fails to reassert, the frame ends up at width=1 with multiple children — the
 * height check passes (children push height past 2), but the width is stuck. This helper
 * flags any auto-layout frame whose width OR height is ≤ `threshold` while it has children,
 * regardless of the other axis.
 */
export function assertNoCollapsedAxis(
  frame: FrameNode,
  threshold = 2,
): CollapsedAxisViolation | null {
  if (frame.children.length === 0) {
    return null;
  }
  const widthCollapsed = frame.width <= threshold;
  const heightCollapsed = frame.height <= threshold;
  if (!widthCollapsed && !heightCollapsed) {
    return null;
  }
  let axis: 'width' | 'height' | 'both';
  if (widthCollapsed && heightCollapsed) {
    axis = 'both';
  } else if (widthCollapsed) {
    axis = 'width';
  } else {
    axis = 'height';
  }
  return {
    kind: 'collapsed-axis',
    frameName: frame.name,
    axis: axis,
    width: frame.width,
    height: frame.height,
    childCount: frame.children.length,
  };
}

/**
 * §0.5 — header cells must be HORIZONTAL with both axes FIXED and height >= 8.
 */
export function assertHeaderCellGeometry(cell: FrameNode): void {
  if (cell.layoutMode !== 'HORIZONTAL') {
    throw new Error(`assertHeaderCellGeometry: expected HORIZONTAL layout on "${cell.name}"`);
  }
  if (cell.primaryAxisSizingMode !== 'FIXED') {
    throw new Error(
      `assertHeaderCellGeometry: primaryAxisSizingMode must be FIXED on "${cell.name}"`,
    );
  }
  if (cell.counterAxisSizingMode !== 'FIXED') {
    throw new Error(
      `assertHeaderCellGeometry: counterAxisSizingMode must be FIXED on "${cell.name}"`,
    );
  }
  if (cell.height < 8) {
    throw new Error(
      `assertHeaderCellGeometry: height ${String(cell.height)} < 8 on "${cell.name}"`,
    );
  }
}
