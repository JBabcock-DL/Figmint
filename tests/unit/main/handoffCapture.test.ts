import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HANDOFF_CAPTURE } from '@/io/messages/handoff';
import { handleHandoffCapture } from '@/main/handoffHandlers';

const mockBuild = vi.fn();
const mockAssert = vi.fn();

vi.mock('@/core/handoff/build', function () {
  return {
    buildHandoffContext: function () {
      return mockBuild();
    },
  };
});

vi.mock('@/core/handoff/validate', function () {
  return {
    assertHandoffContextV1: function (doc: unknown) {
      return mockAssert(doc);
    },
  };
});

describe('handleHandoffCapture', () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(function () {
    postMessage = vi.fn();
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      ui: { postMessage: postMessage },
    };
    mockBuild.mockReset();
    mockAssert.mockReset();
  });

  afterEach(function () {
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('posts handoff/capture-result with markdown on success', async function () {
    mockBuild.mockResolvedValue({
      document: {
        v: 1,
        kind: 'handoff-context',
        meta: {
          capturedAt: '2026-05-29T12:00:00.000Z',
          figmaFileKey: 'abc123',
          frameUrl: 'https://www.figma.com/design/abc123/File?node-id=1-2',
        },
        frames: [],
        components: [{ name: 'Button', instances: 2 }],
        tokensUsed: ['Theme/Primary'],
        autoLayout: { direction: 'vertical', gap: '8px' },
      },
      markdown: '# handoff-context v1\n\n## Components used\n',
      warnings: [],
    });

    await handleHandoffCapture({ type: HANDOFF_CAPTURE, requestId: 'handoff-e2e-1' });

    expect(mockAssert).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(1);
    const payload = postMessage.mock.calls[0][0];
    expect(payload.type).toBe('handoff/capture-result');
    expect(payload.requestId).toBe('handoff-e2e-1');
    expect(payload.ok).toBe(true);
    expect(payload.markdown).toContain('# handoff-context v1');
    expect(payload.markdown).toContain('## Components used');
    expect(typeof payload.durationMs).toBe('number');
  });

  it('posts failure result when build throws', async function () {
    mockBuild.mockRejectedValue(new Error('No selection'));

    await handleHandoffCapture({ type: HANDOFF_CAPTURE, requestId: 'handoff-e2e-2' });

    const payload = postMessage.mock.calls[0][0];
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('No selection');
  });
});
