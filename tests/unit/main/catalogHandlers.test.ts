import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CATALOG_DISCOVER, CATALOG_DISCOVER_RESULT } from '@/io/messages/catalog';
import { handleCatalogDiscover, handleCatalogScaffoldBatch } from '@/main/catalogHandlers';

const mockGetToken = vi.fn();
const mockGetSyncState = vi.fn();
const mockDiscover = vi.fn();
const mockFetchContents = vi.fn();
const mockRunScaffold = vi.fn();
const mockGetRegistry = vi.fn();

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

vi.mock('@/io/github/catalogDiscovery', function () {
  return {
    discoverCatalogEntries: function () {
      return mockDiscover();
    },
    clearCatalogDiscoveryCache: vi.fn(),
  };
});

vi.mock('@/io/github/contents', function () {
  return {
    fetchRepoFileContents: function () {
      return mockFetchContents();
    },
  };
});

vi.mock('@/core/components/scaffold/runScaffold', function () {
  return {
    runScaffoldComponent: function () {
      return mockRunScaffold();
    },
  };
});

vi.mock('@/core/sync/snapshotStore', function () {
  return {
    getRegistryFromSnapshot: function () {
      return mockGetRegistry();
    },
  };
});

describe('catalogHandlers', () => {
  const postMessage = vi.fn();

  beforeEach(function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      ui: { postMessage: postMessage },
      commitUndo: vi.fn(),
    };
    postMessage.mockReset();
    mockGetToken.mockReset();
    mockGetSyncState.mockReset();
    mockDiscover.mockReset();
    mockFetchContents.mockReset();
    mockRunScaffold.mockReset();
    mockGetRegistry.mockReset();

    mockGetRegistry.mockReturnValue({
      v: 1,
      kind: 'registry',
      fileKey: 'fk',
      components: {},
    });
  });

  afterEach(function () {
    delete (globalThis as Record<string, unknown>).figma;
  });

  it('handleCatalogDiscover posts entries on success', async function () {
    mockGetToken.mockResolvedValue({ accessToken: 'token', scope: 'repo' });
    mockGetSyncState.mockResolvedValue({
      resolvedConfig: {
        specsPath: 'components/',
        designSystemBranch: 'main',
        tokensPath: 'design/tokens.json',
        exportBasePath: 'docs/fighub',
      },
    });
    mockDiscover.mockResolvedValue({
      entries: [
        {
          key: 'button',
          path: 'design/components/button.component-spec.v1.json',
          displayName: 'button',
          kind: 'component-spec',
        },
      ],
      truncated: false,
      fetchedAt: Date.now(),
    });

    await handleCatalogDiscover({
      type: CATALOG_DISCOVER,
      requestId: 'discover-1',
      repoUrl: 'https://github.com/acme/widgets',
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CATALOG_DISCOVER_RESULT,
        requestId: 'discover-1',
        ok: true,
        entries: expect.arrayContaining([
          expect.objectContaining({ key: 'button' }),
        ]),
      }),
    );
  });

  it('handleCatalogScaffoldBatch runs sequential scaffolds and posts progress + result', async function () {
    mockGetToken.mockResolvedValue({ accessToken: 'token', scope: 'repo' });
    mockGetSyncState.mockResolvedValue(null);
    mockFetchContents.mockResolvedValue({
      text: JSON.stringify({
        v: 1,
        kind: 'component-spec',
        name: 'Button',
        props: [],
        bindings: [],
        variantMatrix: { axes: [], rows: [] },
      }),
      sha: 'sha',
    });
    mockRunScaffold.mockResolvedValue({
      ok: true,
      registry: {
        v: 1,
        kind: 'registry',
        fileKey: 'fk',
        components: { Button: { nodeId: '1:2' } },
      },
    });
    mockGetRegistry.mockReturnValue({
      v: 1,
      kind: 'registry',
      fileKey: 'fk',
      components: { Button: { nodeId: '1:2' } },
    });

    const paths = [
      'design/components/a.component-spec.v1.json',
      'design/components/b.component-spec.v1.json',
      'design/components/c.component-spec.v1.json',
    ];

    await handleCatalogScaffoldBatch({
      type: 'catalog/scaffold-batch',
      requestId: 'batch-1',
      repoUrl: 'https://github.com/acme/widgets',
      specPaths: paths,
    });

    expect(mockRunScaffold).toHaveBeenCalledTimes(3);
    const progressCalls = postMessage.mock.calls.filter(function (call) {
      return call[0].type === 'catalog/scaffold-batch/progress';
    });
    expect(progressCalls.length).toBeGreaterThanOrEqual(6);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'catalog/scaffold-batch/result',
        requestId: 'batch-1',
        completed: 3,
        failed: 0,
      }),
    );
  });
});
