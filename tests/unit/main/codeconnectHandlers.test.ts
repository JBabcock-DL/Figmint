import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODECONNECT_EMIT_PR } from '@/io/messages/codeconnect';
import { handleCodeConnectEmitPR } from '@/main/codeconnectHandlers';

const mockDetect = vi.fn();
const mockEmit = vi.fn();

vi.mock('@/core/codeconnect/detectUnmapped', function () {
  return {
    detectUnmapped: function () {
      return mockDetect();
    },
  };
});

vi.mock('@/core/codeconnect/emitCodeConnectPR', function () {
  return {
    emitCodeConnectPR: function () {
      return mockEmit();
    },
  };
});

describe('handleCodeConnectEmitPR', () => {
  beforeEach(function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc123',
      root: { name: 'Design System' },
    };
    mockDetect.mockReset();
    mockEmit.mockReset();
  });

  afterEach(function () {
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('returns failure when all components are mapped', async function () {
    mockDetect.mockResolvedValue({ unmapped: [], skippedMapped: 1, skippedNoProps: 0 });

    const result = await handleCodeConnectEmitPR({
      type: CODECONNECT_EMIT_PR,
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'design/components',
      owner: 'acme',
      repo: 'widgets',
      defaultBranch: 'main',
      framework: 'react',
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('already have Code Connect stubs');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('maps emit result to success response with prUrl', async function () {
    mockDetect.mockResolvedValue({
      unmapped: [{ nodeId: '1:2', name: 'Button', componentKey: 'button', fileKey: 'abc123', componentProperties: {} }],
      skippedMapped: 0,
      skippedNoProps: 0,
    });
    mockEmit.mockResolvedValue({
      sink: {
        ok: true,
        sink: 'github-pr',
        message: 'Opened PR #3',
        artifacts: [{ format: 'json', byteLength: 0, destination: 'https://github.com/acme/widgets/pull/3' }],
      },
      stubs: [{ relativePath: 'design/components/button/Button.figma.tsx', content: 'stub' }],
      truncated: false,
    });

    const result = await handleCodeConnectEmitPR({
      type: CODECONNECT_EMIT_PR,
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'design/components',
      owner: 'acme',
      repo: 'widgets',
      defaultBranch: 'main',
      framework: 'react',
    });

    expect(result.ok).toBe(true);
    expect(result.stubCount).toBe(1);
    expect(result.prUrl).toBe('https://github.com/acme/widgets/pull/3');
  });
});
