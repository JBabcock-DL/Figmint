import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { executeGithubPRSink } from '@/io/sinks/githubPR';
import { prepareSinkContent } from '@/io/sinks/prepareContent';
import * as relayClient from '@/io/github/relayClient';
import { setToken } from '@/io/github/storage';
import type { GithubPRSinkContext } from '@/io/sinks/types';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';

const REPO_URL = 'https://github.com/acme/widgets';
const HEAD_BRANCH = 'fighub/drift-report-2026-05-27';
const HEAD_BRANCH_ENCODED = 'fighub%2Fdrift-report-2026-05-27';
const JSON_PATH = 'docs/fighub/drift-report-2026-05-27.v1.json';
const MD_PATH = 'docs/fighub/drift-report-2026-05-27.v1.md';

function installClientStorageMock() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).figma = {
    clientStorage: {
      getAsync: async function (key: string) {
        return store.get(key);
      },
      setAsync: async function (key: string, value: string) {
        store.set(key, value);
      },
      deleteAsync: async function (key: string) {
        store.delete(key);
      },
    },
  };
  return store;
}

function buildDriftGithubPRContext(
  jsonContent: string,
  markdownContent: string,
): GithubPRSinkContext {
  return {
    files: [
      { path: JSON_PATH, content: jsonContent },
      { path: MD_PATH, content: markdownContent },
    ],
    contractKind: 'drift-report',
    repoUrl: REPO_URL,
    options: {
      owner: 'acme',
      repo: 'widgets',
      baseBranch: 'main',
      commitMessage: 'fighub: drift report export',
      headBranch: HEAD_BRANCH,
      prTitle: 'fighub: drift report export',
    },
    figmaFileKey: 'abc123',
    figmaFileName: 'Design System',
  };
}

describe('executeGithubPRSink', () => {
  beforeEach(async function () {
    installClientStorageMock();
    await setToken(REPO_URL, {
      accessToken: 'gho_testtoken',
      scope: 'repo',
      createdAt: '2026-05-27T00:00:00.000Z',
    });
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('commits drift-report json+md siblings in one tree and opens one PR', async function () {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'both' });
    const ctx = buildDriftGithubPRContext(prepared.json, prepared.markdown);

    const calls: string[] = [];
    const treeBodies: unknown[] = [];
    const pullBodies: unknown[] = [];
    let blobPostCount = 0;

    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(async function (
      method,
      path,
      _token,
      body,
    ) {
      calls.push(method + ' ' + path);

      if (path === '/repos/acme/widgets') {
        return { ok: true, status: 200, body: { full_name: 'acme/widgets' } };
      }
      if (path === '/repos/acme/widgets/git/ref/heads/main') {
        return { ok: true, status: 200, body: { object: { sha: 'base-sha' } } };
      }
      if (path === '/repos/acme/widgets/git/commits/base-sha') {
        return { ok: true, status: 200, body: { tree: { sha: 'tree-sha' } } };
      }
      if (path === '/repos/acme/widgets/git/refs') {
        return { ok: true, status: 201, body: { ref: 'refs/heads/' + HEAD_BRANCH } };
      }
      if (path === '/repos/acme/widgets/git/blobs' && method === 'POST') {
        blobPostCount++;
        return { ok: true, status: 201, body: { sha: 'blob-sha-' + String(blobPostCount) } };
      }
      if (path === '/repos/acme/widgets/git/trees' && method === 'POST') {
        treeBodies.push(body);
        return { ok: true, status: 201, body: { sha: 'new-tree-sha' } };
      }
      if (path === '/repos/acme/widgets/git/commits') {
        return { ok: true, status: 201, body: { sha: 'commit-sha' } };
      }
      if (path === '/repos/acme/widgets/git/refs/heads/' + HEAD_BRANCH_ENCODED) {
        return { ok: true, status: 200, body: { object: { sha: 'commit-sha' } } };
      }
      if (path === '/repos/acme/widgets/pulls' && method === 'POST') {
        pullBodies.push(body);
        return {
          ok: true,
          status: 201,
          body: { html_url: 'https://github.com/acme/widgets/pull/42', number: 42 },
        };
      }

      throw new Error('Unexpected path: ' + path);
    });

    const result = await executeGithubPRSink(ctx);

    expect(result).toEqual({
      ok: true,
      sink: 'github-pr',
      message: 'Opened PR #42',
      artifacts: [
        {
          format: 'json',
          byteLength: 0,
          destination: 'https://github.com/acme/widgets/pull/42',
        },
      ],
    });

    expect(blobPostCount).toBe(2);
    expect(treeBodies).toHaveLength(1);
    expect(pullBodies).toHaveLength(1);

    const treeBody = treeBodies[0] as {
      base_tree: string;
      tree: Array<{ path: string; mode: string; type: string; sha: string }>;
    };
    expect(treeBody.base_tree).toBe('tree-sha');
    expect(treeBody.tree).toHaveLength(2);
    expect(treeBody.tree[0]).toMatchObject({
      path: JSON_PATH,
      mode: '100644',
      type: 'blob',
      sha: 'blob-sha-1',
    });
    expect(treeBody.tree[1]).toMatchObject({
      path: MD_PATH,
      mode: '100644',
      type: 'blob',
      sha: 'blob-sha-2',
    });

    expect(pullBodies[0]).toMatchObject({
      title: 'fighub: drift report export',
      head: HEAD_BRANCH,
      base: 'main',
    });

    expect(calls).toEqual([
      'GET /repos/acme/widgets',
      'GET /repos/acme/widgets/git/ref/heads/main',
      'GET /repos/acme/widgets/git/commits/base-sha',
      'POST /repos/acme/widgets/git/refs',
      'POST /repos/acme/widgets/git/blobs',
      'POST /repos/acme/widgets/git/blobs',
      'POST /repos/acme/widgets/git/trees',
      'POST /repos/acme/widgets/git/commits',
      'PATCH /repos/acme/widgets/git/refs/heads/' + HEAD_BRANCH_ENCODED,
      'POST /repos/acme/widgets/pulls',
    ]);
  });
});
