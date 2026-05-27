import { beforeEach, describe, expect, it } from 'vitest';

import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';

import {
  asFrameNode,
  createMockFrame,
  getSetBoundVariableForPaintCallCount,
  installMockFigmaCanvas,
} from './__mocks__/figmaFrames';

describe('bindings', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('bindPaintToVar calls setBoundVariableForPaint before reassigning fills', () => {
    const node = createMockFrame();
    const variable = { id: 'var-1' } as Variable;
    bindPaintToVar(asFrameNode(node), variable);
    expect(getSetBoundVariableForPaintCallCount()).toBe(1);
    expect(node.fills.length).toBe(1);
  });

  it('bindStrokeToVar calls setBoundVariableForPaint before reassigning strokes', () => {
    const node = createMockFrame();
    const variable = { id: 'var-2' } as Variable;
    bindStrokeToVar(asFrameNode(node), variable);
    expect(getSetBoundVariableForPaintCallCount()).toBe(1);
    expect(node.strokes.length).toBe(1);
  });
});
