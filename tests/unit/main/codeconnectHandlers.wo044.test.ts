import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODECONNECT_DETECT_RESULT, CODECONNECT_EMIT_PR_UI_RESULT } from '@/io/messages/codeconnect';
import {
  handleCodeConnectDetect,
  handleCodeConnectEmitPr,
} from '@/main/codeconnectHandlers';

const mockDetect = vi.fn();
const mockEmit = vi.fn();
const mockGetToken = vi.fn();
const mockGetSyncState = vi.fn();
const mockListRepoPaths = vi.fn();

vi.mock('@/config/flags', function () {
  return { flags: { codeConnectPR: true } };
});

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

vi.mock('@/core/codeconnect/figmaComponentReader', function () {
  return {
    collectUnmappedCandidates: function () {
      return [];
    },
  };
});

vi.mock('@/io/github/storage', function () {
  return {
    getToken: function () {
      return mockGetToken();
    },
    getSyncState: function () {
      return mockGetSyncState();
    },
  };
});

vi.mock('@/main/importHandlers', function () {
  return {
    fetchRecursiveRepoPaths: function () {
      return mockListRepoPaths();
    },
  };
});

describe('codeconnectHandlers WO-044', () => {
  beforeEach(function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'abc123',
      root: { name: 'Design System' },
      ui: { postMessage: vi.fn() },
    };
    mockGetToken.mockResolvedValue({ accessToken: 'token' });
    mockGetSyncState.mockResolvedValue({
      resolvedConfig: { specsPath: 'design/components/', designSystemBranch: 'main' },
      defaultBranch: 'main',
    });
    mockListRepoPaths.mockResolvedValue([]);
    mockDetect.mockReset();
    mockEmit.mockReset();
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  it('handleCodeConnectDetect returns 2 unmapped refs', async function () {
    mockDetect.mockResolvedValue({
      unmapped: [
        { nodeId: '1:1', name: 'Alpha', componentKey: 'alpha', fileKey: 'abc', componentProperties: {} },
        { nodeId: '2:2', name: 'Beta', componentKey: 'beta', fileKey: 'abc', componentProperties: {} },
      ],
      skippedMapped: 0,
      skippedNoProps: 0,
    });

    await handleCodeConnectDetect({
      type: 'codeconnect/detect',
      requestId: 'det-1',
      repoUrl: 'https://github.com/acme/widgets',
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.type).toBe(CODECONNECT_DETECT_RESULT);
    expect(posted.ok).toBe(true);
    expect(posted.unmapped).toHaveLength(2);
  });

  it('handleCodeConnectEmitPr returns prUrl on success', async function () {
    mockDetect.mockResolvedValue({
      unmapped: [
        { nodeId: '1:2', name: 'Button', componentKey: 'button', fileKey: 'abc', componentProperties: { variant: { type: 'VARIANT' } } },
      ],
      skippedMapped: 0,
      skippedNoProps: 0,
    });
    mockEmit.mockResolvedValue({
      sink: {
        ok: true,
        sink: 'github-pr',
        message: 'ok',
        artifacts: [{ format: 'json', byteLength: 0, destination: 'https://github.com/o/r/pull/42' }],
      },
      stubs: [{ relativePath: 'a.figma.tsx', content: 'stub' }],
      truncated: false,
    });

    await handleCodeConnectEmitPr({
      type: 'codeconnect/emit-pr',
      requestId: 'emit-1',
      repoUrl: 'https://github.com/acme/widgets',
      componentIds: ['1:2'],
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.type).toBe(CODECONNECT_EMIT_PR_UI_RESULT);
    expect(posted.ok).toBe(true);
    expect(posted.prUrl).toBe('https://github.com/o/r/pull/42');
  });

  it('handleCodeConnectEmitPr returns auth error when disconnected', async function () {
    mockGetToken.mockResolvedValue(null);

    await handleCodeConnectEmitPr({
      type: 'codeconnect/emit-pr',
      requestId: 'emit-2',
      repoUrl: 'https://github.com/acme/widgets',
      componentIds: ['1:2'],
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.ok).toBe(false);
    expect(posted.code).toBe('auth-required');
  });
});
