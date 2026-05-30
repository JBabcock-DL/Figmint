import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildHandoffContext } from '@/core/handoff/build';

const capturedFrameFixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/handoff/captured-frame-min.json'), 'utf8'),
);

const mockCapture = vi.fn();
const mockEnumerateComponents = vi.fn();
const mockEnumerateTokensAndLayout = vi.fn();

vi.mock('@/core/handoff/capture', function () {
  return {
    captureSelection: function () {
      return mockCapture();
    },
  };
});

vi.mock('@/core/handoff/components', function () {
  return {
    enumerateComponents: function () {
      return mockEnumerateComponents();
    },
  };
});

vi.mock('@/core/handoff/tokens', function () {
  return {
    enumerateTokensAndLayout: function () {
      return mockEnumerateTokensAndLayout();
    },
  };
});

describe('buildHandoffContext latency', () => {
  beforeEach(function () {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const node = { id: '1:2', name: 'Checkout', type: 'FRAME' } as SceneNode;
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc123',
      root: { name: 'My Design File' },
      getNodeByIdAsync: vi.fn(async function () {
        await new Promise(function (resolvePromise) {
          setTimeout(resolvePromise, 20);
        });
        return node;
      }),
    };

    mockCapture.mockImplementation(function () {
      return new Promise(function (resolvePromise) {
        setTimeout(function () {
          resolvePromise({ frames: [capturedFrameFixture], warnings: [], fileKey: 'abc123', fileKeySource: 'api' });
        }, 50);
      });
    });
    mockEnumerateComponents.mockImplementation(function () {
      return new Promise(function (resolvePromise) {
        setTimeout(function () {
          resolvePromise([{ name: 'Button', instances: 1 }]);
        }, 20);
      });
    });
    mockEnumerateTokensAndLayout.mockImplementation(function () {
      return new Promise(function (resolvePromise) {
        setTimeout(function () {
          resolvePromise({
            tokens: ['Theme/Primary'],
            autoLayout: { direction: 'vertical', gap: '8px' },
          });
        }, 20);
      });
    });
  });

  afterEach(function () {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('completes capture pipeline under 1000ms budget', async function () {
    const start = Date.now();
    const result = await buildHandoffContext();
    const elapsed = Date.now() - start;

    expect(result.document.frames.length).toBe(1);
    expect(elapsed).toBeLessThan(1000);
  });
});
