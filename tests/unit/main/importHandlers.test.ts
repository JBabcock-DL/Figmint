import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactImportTemplate } from '@/core/import';
import { IMPORT_LIST_FILES_RESULT, IMPORT_PARSE_EXEC } from '@/io/messages/import';
import {
  handleImportListFiles,
  handleImportParse,
  handleImportParseExecResult,
} from '@/main/importHandlers';
import { runImportParseExec } from '@/ui/import/runImportParseExec';

const mockGetToken = vi.fn();
const mockGetSyncState = vi.fn();
const mockGithubApi = vi.fn();
const mockFetchContents = vi.fn();
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

vi.mock('@/io/github/relayClient', function () {
  return {
    githubApiViaRelay: function () {
      return mockGithubApi();
    },
  };
});

vi.mock('@/io/github/contents', function () {
  class GitHubNotFoundError extends Error {
    readonly name = 'GitHubNotFoundError';
  }
  return {
    fetchRepoFileContents: function (
      token: string,
      owner: string,
      repo: string,
      path: string,
      ref?: string,
    ) {
      return mockFetchContents(token, owner, repo, path, ref);
    },
    GitHubNotFoundError: GitHubNotFoundError,
  };
});

vi.mock('@/core/sync/snapshotStore', function () {
  return {
    getRegistryFromSnapshot: function () {
      return mockGetRegistry();
    },
  };
});

vi.mock('@/core/import/registry', function () {
  return {
    getImportTemplate: function () {
      return new ReactImportTemplate();
    },
  };
});

vi.mock('@/core/import/shared/tokenResolver', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/core/import/shared/tokenResolver')>();
  return {
    ...actual,
    buildTokenResolverClassMap: async function () {
      return {};
    },
  };
});

vi.mock('@/io/github/tokenResolverStorage', function () {
  return {
    loadTokenResolverOverride: async function () {
      return null;
    },
  };
});

const buttonSource = readFileSync(
  resolve(__dirname, '../../fixtures/sources/button.tsx'),
  'utf8',
);

describe('importHandlers', () => {
  beforeEach(function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      ui: { postMessage: vi.fn() },
    };
    mockGetToken.mockResolvedValue({ accessToken: 'token' });
    mockGetSyncState.mockResolvedValue({
      resolvedConfig: { specsPath: 'design/components/' },
      defaultBranch: 'main',
    });
    mockGetRegistry.mockReturnValue({ v: 1, kind: 'registry', fileKey: 'fk', components: {} });
    mockFetchContents.mockImplementation(async function (
      _token: string,
      _o: string,
      _r: string,
      path: string,
    ) {
      if (path.includes('.figma.tsx') || path === '.fighub-registry.json') {
        const mod = await import('@/io/github/contents');
        throw new mod.GitHubNotFoundError('not found');
      }
      return { text: buttonSource, sha: 'sha' };
    });
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  it('lists tsx files excluding test/story/figma paths', async function () {
    mockGithubApi
      .mockResolvedValueOnce({
        ok: true,
        body: { object: { sha: 'tree-sha' } },
      })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          tree: [
            { path: 'src/components/button.tsx', type: 'blob' },
            { path: 'src/components/button.test.tsx', type: 'blob' },
            { path: 'src/components/button.stories.tsx', type: 'blob' },
            { path: 'src/components/button.figma.tsx', type: 'blob' },
            { path: 'src/components/card.tsx', type: 'blob' },
          ],
        },
      });

    await handleImportListFiles({
      type: 'import/list-files',
      requestId: 'list-1',
      repoUrl: 'https://github.com/acme/widgets',
      rootPath: 'src/components/',
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.type).toBe(IMPORT_LIST_FILES_RESULT);
    expect(posted.ok).toBe(true);
    expect(posted.files).toHaveLength(2);
    expect(posted.files[0].name).toBe('button.tsx');
    expect(posted.files[1].name).toBe('card.tsx');
  });

  it('dispatches import/parse/exec to UI after loading source', async function () {
    await handleImportParse({
      type: 'import/parse',
      requestId: 'parse-1',
      repoUrl: 'https://github.com/acme/widgets',
      sourcePath: 'components/ui/button.tsx',
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.type).toBe(IMPORT_PARSE_EXEC);
    expect(posted.requestId).toBe('parse-1');
    expect(posted.sourceText).toBe(buttonSource);
  });

  it('forwards UI parse exec result as import/parse/result', async function () {
    await handleImportParse({
      type: 'import/parse',
      requestId: 'parse-2',
      repoUrl: 'https://github.com/acme/widgets',
      sourcePath: 'components/ui/button.tsx',
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const execMsg = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    const execResult = runImportParseExec(execMsg);

    figmaGlobal.figma.ui.postMessage.mockClear();
    handleImportParseExecResult(execResult);

    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    if (!posted.ok) {
      throw new Error(posted.error !== undefined ? posted.error : 'parse failed');
    }
    expect(posted.spec.name).toBe('Button');
    expect(posted.spec.archetype).toBe('chip');
  });

  it('returns error when GitHub token missing', async function () {
    mockGetToken.mockResolvedValue(null);

    await handleImportListFiles({
      type: 'import/list-files',
      requestId: 'list-2',
      repoUrl: 'https://github.com/acme/widgets',
    });

    const figmaGlobal = globalThis as { figma: { ui: { postMessage: ReturnType<typeof vi.fn> } } };
    const posted = figmaGlobal.figma.ui.postMessage.mock.calls[0][0];
    expect(posted.ok).toBe(false);
    expect(posted.error).toContain('not connected');
  });
});
