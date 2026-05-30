import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildHandoffContext } from '@/core/handoff/build';

const goldenFixture = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../fixtures/handoff/handoff-context-built.v1.json'),
    'utf8',
  ),
) as HandoffContextV1;

const capturedFrameFixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/handoff/captured-frame-min.json'), 'utf8'),
);

const mockCapture = vi.fn();
const mockEnumerateComponents = vi.fn();
const mockEnumerateTokensAndLayout = vi.fn();

vi.mock('@/core/handoff/capture', function () {
  return { captureSelection: function () {
    return mockCapture();
  } };
});

vi.mock('@/core/handoff/components', function () {
  return { enumerateComponents: function () {
    return mockEnumerateComponents();
  } };
});

vi.mock('@/core/handoff/tokens', function () {
  return { enumerateTokensAndLayout: function () {
    return mockEnumerateTokensAndLayout();
  } };
});

function redactDataUrls(doc: HandoffContextV1): HandoffContextV1 {
  return {
    ...doc,
    frames: doc.frames.map(function (frame) {
      return {
        ...frame,
        screenshot: {
          ...frame.screenshot,
          dataUrl: '[PNG]',
        },
      };
    }),
  };
}

describe('buildHandoffContext golden snapshot', () => {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));

    const node = { id: '1:2', name: 'Checkout', type: 'FRAME' } as SceneNode;
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc123',
      root: { name: 'My Design File' },
      getNodeByIdAsync: vi.fn(async function () {
        return node;
      }),
    };

    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture],
      warnings: [],
      fileKey: 'abc123',
      fileKeySource: 'api',
    });
    mockEnumerateComponents.mockResolvedValue(goldenFixture.components);
    mockEnumerateTokensAndLayout.mockResolvedValue({
      tokens: goldenFixture.tokensUsed,
      autoLayout: goldenFixture.autoLayout,
    });
  });

  afterEach(function () {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('matches golden handoff-context-built.v1.json with redacted screenshots', async function () {
    const result = await buildHandoffContext();
    expect(redactDataUrls(result.document)).toEqual(goldenFixture);
  });
});
