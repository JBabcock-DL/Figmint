/// <reference types="@figma/plugin-typings" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureSelection } from '@/core/handoff/capture';

import {
  createMockExportableNode,
  installHandoffFigmaMock,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';

describe('captureSelection', () => {
  beforeEach(function () {
    vi.useRealTimers();
  });

  afterEach(function () {
    restoreHandoffFigmaMock();
    vi.useRealTimers();
  });

  it('captures a single selected frame', async function () {
    const node = createMockExportableNode({ id: '1:2', name: 'Checkout' });
    installHandoffFigmaMock({ selection: [node] });

    const result = await captureSelection();

    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].nodeId).toBe('1:2');
    expect(result.frames[0].name).toBe('Checkout');
    expect(result.frames[0].deepLink).toContain('node-id=1-2');
    expect(result.frames[0].screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('captures multiple selected frames', async function () {
    installHandoffFigmaMock({
      selection: [
        createMockExportableNode({ id: '1:1', name: 'A' }),
        createMockExportableNode({ id: '2:2', name: 'B' }),
      ],
    });

    const result = await captureSelection();

    expect(result.frames).toHaveLength(2);
    expect(result.frames[0].nodeId).not.toBe(result.frames[1].nodeId);
  });

  it('throws when selection is empty', async function () {
    installHandoffFigmaMock({ selection: [] });
    await expect(captureSelection()).rejects.toThrow('No selection');
  });

  it('throws when selection exceeds cap', async function () {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < 11; i++) {
      nodes.push(createMockExportableNode({ id: String(i) + ':1', name: 'Frame ' + String(i) }));
    }
    installHandoffFigmaMock({ selection: nodes });
    await expect(captureSelection()).rejects.toThrow('Selection exceeds maximum of 10 nodes');
  });

  it('returns empty deep link and warning when fileKey is blank', async function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: '',
    });

    const result = await captureSelection();

    expect(result.frames[0].deepLink).toBe('');
    expect(result.warnings.some((w) => w.includes('Deep links unavailable') || w.includes('Settings'))).toBe(true);
  });

  it('allows partial capture when one export fails', async function () {
    installHandoffFigmaMock({
      selection: [
        createMockExportableNode({ id: '1:1', name: 'Good' }),
        createMockExportableNode({
          id: '2:2',
          name: 'Bad',
          exportError: new Error('locked'),
        }),
      ],
    });

    const result = await captureSelection();

    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].name).toBe('Good');
    expect(result.warnings.some((w) => w.includes('Bad'))).toBe(true);
  });

  it('exports frames in parallel', async function () {
    vi.useFakeTimers();
    installHandoffFigmaMock({
      selection: [
        createMockExportableNode({ id: '1:1', exportDelayMs: 100 }),
        createMockExportableNode({ id: '2:2', exportDelayMs: 100 }),
        createMockExportableNode({ id: '3:3', exportDelayMs: 100 }),
      ],
    });

    const promise = captureSelection();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.frames).toHaveLength(3);
  });

  it('completes within performance budget for typical frames', async function () {
    installHandoffFigmaMock({
      selection: [
        createMockExportableNode({ id: '1:1', exportDelayMs: 50 }),
        createMockExportableNode({ id: '2:2', exportDelayMs: 50 }),
        createMockExportableNode({ id: '3:3', exportDelayMs: 50 }),
      ],
    });

    const start = Date.now();
    const result = await captureSelection();
    const elapsed = Date.now() - start;

    expect(result.frames).toHaveLength(3);
    expect(elapsed).toBeLessThan(1000);
  });
});
