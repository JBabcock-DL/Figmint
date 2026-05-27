const DEFAULT_FILL: SolidPaint = {
  type: 'SOLID',
  color: { r: 0.9, g: 0.9, b: 0.9 },
  opacity: 1,
};

const DEFAULT_STROKE: SolidPaint = {
  type: 'SOLID',
  color: { r: 0.8, g: 0.8, b: 0.8 },
  opacity: 1,
};

function cloneSolidPaint(paint: Paint): SolidPaint {
  if (paint.type === 'SOLID') {
    return Object.assign({}, paint);
  }
  return DEFAULT_FILL;
}

function firstSolidPaint(
  paints: readonly Paint[] | PluginAPI['mixed'],
  fallback: SolidPaint,
): SolidPaint {
  if (!Array.isArray(paints) || paints.length === 0) {
    return fallback;
  }
  const first = paints[0] as Paint;
  return cloneSolidPaint(first);
}

/**
 * §0.7 — clone existing paint, bind variable, reassign fills array.
 * Accepts a pre-resolved Variable; path resolution stays in the variables layer.
 */
export function bindPaintToVar(node: GeometryMixin & MinimalFillsMixin, variable: Variable): void {
  const base = firstSolidPaint(node.fills, DEFAULT_FILL);
  const bound = figma.variables.setBoundVariableForPaint(base, 'color', variable);
  node.fills = [bound];
}

/**
 * §0.7 — clone existing stroke paint, bind variable, reassign strokes array.
 */
export function bindStrokeToVar(
  node: GeometryMixin & MinimalStrokesMixin,
  variable: Variable,
): void {
  const base = firstSolidPaint(node.strokes, DEFAULT_STROKE);
  const bound = figma.variables.setBoundVariableForPaint(base, 'color', variable);
  node.strokes = [bound];
}
