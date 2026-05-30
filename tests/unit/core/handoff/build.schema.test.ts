import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildHandoffContext } from '@/core/handoff/build';
import { assertHandoffContextV1 } from '@/core/handoff/validate';

import handoffFixture from '../../../fixtures/io/sources/handoff-context.json';

const capturedFrameFixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/handoff/captured-frame-min.json'), 'utf8'),
) as HandoffContextV1['frames'][number];

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

describe('buildHandoffContext schema validation', () => {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const node = { id: '1:2', name: 'Checkout', type: 'FRAME' } as SceneNode;
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc',
      root: { name: 'Handoff' },
      getNodeByIdAsync: vi.fn(async function () {
        return node;
      }),
    };

    mockCapture.mockResolvedValue({
      frames: [capturedFrameFixture],
      warnings: [],
      fileKey: 'abc',
      fileKeySource: 'api',
    });
    mockEnumerateComponents.mockResolvedValue(handoffFixture.components);
    mockEnumerateTokensAndLayout.mockResolvedValue({
      tokens: handoffFixture.tokensUsed,
      autoLayout: handoffFixture.autoLayout,
    });
  });

  afterEach(function () {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('validates build output against HandoffContextV1 schema', async function () {
    const result = await buildHandoffContext();
    expect(function () {
      assertHandoffContextV1(result.document);
    }).not.toThrow();
  });

  it('rejects invalid documents', function () {
    expect(function () {
      assertHandoffContextV1({ kind: 'handoff-context', v: 2 });
    }).toThrow(/Invalid HandoffContextV1/);
  });
});
