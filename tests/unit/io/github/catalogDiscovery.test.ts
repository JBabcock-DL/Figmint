import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import fixtureTree from '../../../fixtures/github/catalog-tree-fighub.json';
import truncatedTree from '../../../fixtures/github/catalog-tree-truncated.json';
import {
  clearCatalogDiscoveryCache,
  dedupeCatalogEntries,
  discoverCatalogEntries,
  extractCatalogKey,
  filterTreePaths,
  type GitHubTreeEntry,
} from '@/io/github/catalogDiscovery';
import { githubApiViaRelay } from '@/io/github/relayClient';

vi.mock('@/io/github/relayClient', function () {
  return {
    githubApiViaRelay: vi.fn(),
  };
});

const mockRelay = vi.mocked(githubApiViaRelay);

describe('catalogDiscovery', () => {
  beforeEach(function () {
    clearCatalogDiscoveryCache();
    mockRelay.mockReset();
  });

  afterEach(function () {
    clearCatalogDiscoveryCache();
  });

  it('extractCatalogKey kebab-cases filename stems', function () {
    expect(extractCatalogKey('design/components/MyButton.component-spec.v1.json')).toBe('my-button');
  });

  it('filterTreePaths returns discoverable specs from fixture tree', function () {
    const tree = fixtureTree.tree as GitHubTreeEntry[];
    const entries = filterTreePaths(tree, 'components/');
    expect(entries.length).toBeGreaterThanOrEqual(2);
    const paths = entries.map(function (entry) {
      return entry.path;
    });
    expect(paths).toContain('design/components/button.component-spec.v1.json');
    expect(paths).toContain('design/components/input.component-spec.v1.json');
  });

  it('dedupeCatalogEntries prefers shortest path for duplicate keys', function () {
    const deduped = dedupeCatalogEntries([
      {
        key: 'button',
        path: 'design/components/extra/button.component-spec.v1.json',
        displayName: 'button',
        kind: 'component-spec',
      },
      {
        key: 'button',
        path: 'design/components/button.component-spec.v1.json',
        displayName: 'button',
        kind: 'component-spec',
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].path).toBe('design/components/button.component-spec.v1.json');
  });

  it('resolveBranchTreeSha and tree fetch return catalog entries', async function () {
    mockRelay
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { object: { sha: 'commit-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { tree: { sha: 'tree-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: fixtureTree,
      });

    const result = await discoverCatalogEntries(
      'https://github.com/acme/widgets',
      'token',
      { specsPath: 'components/', designSystemBranch: 'main' },
    );

    expect(result.entries.length).toBeGreaterThanOrEqual(2);
    expect(result.truncated).toBe(false);
    expect(mockRelay).toHaveBeenCalledTimes(3);
  });

  it('uses cache within TTL on second call', async function () {
    mockRelay
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { object: { sha: 'commit-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { tree: { sha: 'tree-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: fixtureTree,
      });

    const config = { specsPath: 'components/', designSystemBranch: 'main' };
    await discoverCatalogEntries('https://github.com/acme/widgets', 'token', config);
    const second = await discoverCatalogEntries('https://github.com/acme/widgets', 'token', config);
    expect(second.entries.length).toBeGreaterThanOrEqual(2);
    expect(mockRelay).toHaveBeenCalledTimes(3);
  });

  it('refetches after forceRefresh clears cache', async function () {
    const refResponse = { ok: true, status: 200, body: { object: { sha: 'commit-sha' } } };
    const commitTreeResponse = { ok: true, status: 200, body: { tree: { sha: 'tree-sha' } } };
    const treeResponse = { ok: true, status: 200, body: fixtureTree };

    mockRelay
      .mockResolvedValueOnce(refResponse)
      .mockResolvedValueOnce(commitTreeResponse)
      .mockResolvedValueOnce(treeResponse)
      .mockResolvedValueOnce(refResponse)
      .mockResolvedValueOnce(commitTreeResponse)
      .mockResolvedValueOnce(treeResponse);

    const config = { specsPath: 'components/', designSystemBranch: 'main' };
    await discoverCatalogEntries('https://github.com/acme/widgets', 'token', config);
    await discoverCatalogEntries('https://github.com/acme/widgets', 'token', config, {
      forceRefresh: true,
    });
    expect(mockRelay).toHaveBeenCalledTimes(6);
  });

  it('falls back to contents walk when tree is truncated', async function () {
    mockRelay
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { object: { sha: 'commit-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { tree: { sha: 'tree-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: truncatedTree,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: [
          {
            path: 'components/alert.json',
            type: 'file',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: [
          {
            path: 'design/components/button.component-spec.v1.json',
            type: 'file',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: [],
      });

    const result = await discoverCatalogEntries(
      'https://github.com/acme/widgets',
      'token',
      { specsPath: 'components/', designSystemBranch: 'main' },
    );

    expect(result.truncated).toBe(true);
    expect(result.entries.length).toBeGreaterThanOrEqual(1);
    expect(mockRelay.mock.calls.length).toBeGreaterThan(3);
  });
});
