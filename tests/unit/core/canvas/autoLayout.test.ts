import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertNoOnePxMaster,
  createHugFrame,
  reassertHug,
  resizeThenApplySizing,
} from '@/core/canvas/helpers/autoLayout';

import {
  asFrameNode,
  createMockFrame,
  installMockFigmaCanvas,
  MockFrame,
} from './__mocks__/figmaFrames';

describe('autoLayout helpers', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('resize() on mock resets both sizing modes to FIXED', () => {
    const frame = createMockFrame({
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
    });
    frame.resize(200, 40);
    expect(frame.primaryAxisSizingMode).toBe('FIXED');
    expect(frame.counterAxisSizingMode).toBe('FIXED');
  });

  it('resizeThenApplySizing applies sizing after resize (resize would reset AUTO to FIXED)', () => {
    const frame = createMockFrame();
    const resizeSpy = vi.spyOn(frame, 'resize');
    const node = asFrameNode(frame);

    resizeThenApplySizing(node, 320, 56, {
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
    });

    expect(resizeSpy).toHaveBeenCalledWith(320, 56);
    expect(frame.primaryAxisSizingMode).toBe('AUTO');
    expect(frame.counterAxisSizingMode).toBe('AUTO');
  });

  it('reassertHug restores AUTO after mock appendChild flips sizing', () => {
    const row = createHugFrame({ layoutMode: 'HORIZONTAL', width: 1640, name: 'row/test' });
    const inner = asFrameNode(row as unknown as MockFrame);
    const child = createMockFrame();
    inner.appendChild(asFrameNode(child));
    expect((row as unknown as MockFrame).counterAxisSizingMode).toBe('FIXED');

    reassertHug(inner, 'vertical');
    expect((row as unknown as MockFrame).counterAxisSizingMode).toBe('AUTO');
    expect((row as unknown as MockFrame).layoutSizingVertical).toBe('HUG');
  });

  it('assertNoOnePxMaster flags 1px frame with tall child', () => {
    const frame = createMockFrame({ width: 200, height: 1 });
    const child = createMockFrame({ height: 64 });
    frame.appendChild(asFrameNode(child));

    const violation = assertNoOnePxMaster(asFrameNode(frame));
    expect(violation).not.toBeNull();
    if (violation !== null) {
      expect(violation.kind).toBe('one-px-master');
      expect(violation.width).toBe(200);
      expect(violation.height).toBe(1);
      expect(violation.childCount).toBe(1);
    }
  });

  it('assertNoOnePxMaster returns null for healthy frame height', () => {
    const frame = createMockFrame({ width: 200, height: 64 });
    expect(assertNoOnePxMaster(asFrameNode(frame))).toBeNull();
  });
});
