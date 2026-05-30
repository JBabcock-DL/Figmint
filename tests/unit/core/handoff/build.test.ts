import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildFileUrl,
  buildHandoffContext,
  estimatePayloadBytes,
  PLUGIN_DATA_MAX_BYTES,
} from '@/core/handoff/build';

const capturedFrameFixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/handoff/captured-frame-min.json'), 'utf8'),
) as HandoffContextV1['frames'][number];

const frameTwo = {
  nodeId: '2:3',
  name: 'Details',
  deepLink: 'https://www.figma.com/design/abc123/My%20Design%20File?node-id=2-3',
  screenshot: capturedFrameFixture.screenshot,
};

const mockCapture = vi.fn();
const mockEnumerateComponents = vi.fn();
const mockEnumerateTokensAndLayout = vi.fn();

vi.mock('@/core/handoff/capture', function () {
  return { captureSelection: function () {
    return mockCapture();
  } };
});

vi.mock('@/core/handoff/components', function () {
  return { enumerateComponents: function (root: SceneNode) {
    return mockEnumerateComponents(root);
  } };
});

vi.mock('@/core/handoff/tokens', function () {
  return { enumerateTokensAndLayout: function (root: SceneNode) {
    return mockEnumerateTokensAndLayout(root);
  } };
});

/*
 * Thread-split matrix (WO-037 Step 17):
 * | Concern              | Main thread | UI iframe |
 * | Figma selection read | yes         | no        |
 * | PNG export           | yes         | no        |
 * | Tree walks           | yes         | no        |
 * | Markdown preview     | main        | displays  |
 * | Clipboard sink       | via export  | yes       |
 * | GitHub PR sink       | handleExportRun | opt-in |
 *
 * UI must not import @/core/handoff/build — use prepareHandoffExport + messages only.
 */

describe('buildFileUrl', () => {
  it('returns empty string when fileKey is blank', () => {
    expect(buildFileUrl('', 'Untitled')).toBe('');
  });

  it('builds file-level design URL without node-id', () => {
    expect(buildFileUrl('abc123', 'My Design File')).toBe(
      'https://www.figma.com/design/abc123/My%20Design%20File',
    );
  });
});

describe('buildHandoffContext', () => {
  let nodeRegistry: Map<string, SceneNode>;

  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));

    nodeRegistry = new Map();
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc123',
      root: { name: 'My Design File' },
      getNodeByIdAsync: vi.fn(async function (id: string) {
        return nodeRegistry.get(id) ?? null;
      }),
    };

    mockCapture.mockReset();
    mockEnumerateComponents.mockReset();
    mockEnumerateTokensAndLayout.mockReset();
  });

  afterEach(function () {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).figma;
  });

  function registerNode(id: string, name: string): SceneNode {
    const node = { id: id, name: name, type: 'FRAME' } as SceneNode;
    nodeRegistry.set(id, node);
    return node;
  }

  it('assembles a single-frame handoff document', async function () {
    registerNode('1:2', 'Checkout');
    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture],
      warnings: [],
      fileKey: 'abc123',
      fileKeySource: 'api',
    });
    mockEnumerateComponents.mockResolvedValue([
      { name: 'Button', instances: 4, codeConnectUrl: 'https://github.com/a/Button.tsx' },
    ]);
    mockEnumerateTokensAndLayout.mockResolvedValue({
      tokens: ['Theme/Primary'],
      autoLayout: { direction: 'vertical', gap: '16px', padding: '8px' },
    });

    const result = await buildHandoffContext();

    expect(result.document.v).toBe(1);
    expect(result.document.kind).toBe('handoff-context');
    expect(result.document.meta.figmaFileKey).toBe('abc123');
    expect(result.document.meta.frameUrl).toBe(capturedFrameFixture.deepLink);
    expect(result.document.meta.capturedAt).toBe('2026-05-29T12:00:00.000Z');
    expect(result.document.frames).toEqual([capturedFrameFixture]);
    expect(result.document.components).toEqual([
      { name: 'Button', instances: 4, codeConnectUrl: 'https://github.com/a/Button.tsx' },
    ]);
    expect(result.document.tokensUsed).toEqual(['Theme/Primary']);
    expect(result.document.autoLayout).toEqual({
      direction: 'vertical',
      gap: '16px',
      padding: '8px',
    });
    expect(result.markdown).toContain('# handoff-context v1');
    expect(result.markdown).toContain('## Components used');
    expect(result.markdown).toMatch(/!\[/);
    expect(result.warnings).toEqual([]);
  });

  it('merges components and tokens across multiple frames', async function () {
    registerNode('1:2', 'Checkout');
    registerNode('2:3', 'Details');
    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture, frameTwo],
      warnings: [],
      fileKey: 'abc123',
      fileKeySource: 'api',
    });
    mockEnumerateComponents
      .mockResolvedValueOnce([{ name: 'Button', instances: 2 }])
      .mockResolvedValueOnce([
        { name: 'Button', instances: 2 },
        { name: 'Input', instances: 1 },
      ]);
    mockEnumerateTokensAndLayout
      .mockResolvedValueOnce({
        tokens: ['Theme/Primary'],
        autoLayout: { direction: 'vertical', gap: '8px' },
      })
      .mockResolvedValueOnce({
        tokens: ['Theme/Secondary'],
        autoLayout: { direction: 'horizontal', gap: '12px' },
      });

    const result = await buildHandoffContext();

    expect(result.document.components).toEqual([
      { name: 'Button', instances: 4 },
      { name: 'Input', instances: 1 },
    ]);
    expect(result.document.tokensUsed).toEqual(['Theme/Primary', 'Theme/Secondary']);
    expect(result.document.autoLayout).toEqual({ direction: 'vertical', gap: '8px' });
  });

  it('warns when a captured frame node is missing', async function () {
    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture],
      warnings: [],
      fileKey: 'abc123',
      fileKeySource: 'api',
    });

    const result = await buildHandoffContext();

    expect(result.warnings).toContain('Node not found for frame "Checkout" (1:2)');
    expect(mockEnumerateComponents).not.toHaveBeenCalled();
  });

  it('uses file-level URL and unknown file key when capture has no deep links', async function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: '',
      root: { name: 'Local Draft' },
      getNodeByIdAsync: vi.fn(async function () {
        return null;
      }),
    };

    mockCapture.mockResolvedValue({
      frames: [{ ...capturedFrameFixture, deepLink: '' }],
      warnings: ['Deep links unavailable — save this file to Figma cloud, or set a file key in Settings.'],
      fileKey: '',
      fileKeySource: 'none',
    });

    const result = await buildHandoffContext();

    expect(result.document.meta.figmaFileKey).toBe('unknown');
    expect(result.document.meta.frameUrl).toBe('');
    expect(result.warnings.some((w) => w.includes('save this file'))).toBe(true);
  });

  it('uses override file key from capture for meta', async function () {
    registerNode('1:2', 'Checkout');
    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture],
      warnings: [],
      fileKey: 'manualKey1234',
      fileKeySource: 'override',
    });
    mockEnumerateComponents.mockResolvedValue([]);
    mockEnumerateTokensAndLayout.mockResolvedValue({
      tokens: [],
      autoLayout: { direction: 'vertical', gap: '0' },
    });

    const result = await buildHandoffContext();

    expect(result.document.meta.figmaFileKey).toBe('manualKey1234');
  });

  it('warns when plugin-data payload exceeds size budget', async function () {
    registerNode('1:2', 'Checkout');
    const largeDataUrl = 'data:image/png;base64,' + 'A'.repeat(PLUGIN_DATA_MAX_BYTES);
    mockCapture.mockResolvedValue({
      frames: [{ ...capturedFrameFixture, screenshot: { format: 'png', dataUrl: largeDataUrl } }],
      warnings: [],
      fileKey: 'abc123',
      fileKeySource: 'api',
    });
    mockEnumerateComponents.mockResolvedValue([]);
    mockEnumerateTokensAndLayout.mockResolvedValue({
      tokens: [],
      autoLayout: { direction: 'vertical', gap: '0' },
    });

    const result = await buildHandoffContext();

    expect(estimatePayloadBytes(result.document)).toBeGreaterThan(PLUGIN_DATA_MAX_BYTES);
    expect(result.warnings).toContain(
      'Plugin-data export may exceed 100 kB — use clipboard or download',
    );
  });
});
