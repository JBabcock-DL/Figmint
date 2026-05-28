import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPullRequestFlow,
  createPullRequestFromSinkContext,
} from '@/io/github/createPullRequestFlow';
import { GitHubFlowError } from '@/io/github/githubErrors';
import * as relayClient from '@/io/github/relayClient';
import type { GithubPRSinkContext } from '@/io/sinks/types';

const BASE_HEAD = 'fighub/drift-report-2026-05-27';
const BASE_HEAD_ENCODED = 'fighub%2Fdrift-report-2026-05-27';
const SUFFIX_HEAD = 'fighub/drift-report-2026-05-27-2';
const SUFFIX_HEAD_ENCODED = 'fighub%2Fdrift-report-2026-05-27-2';

function buildHappyPathHandler(calls: string[], headBranch: string, headBranchEncoded: string) {
  return async function (method: 'GET' | 'POST' | 'PATCH', path: string) {
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
      return { ok: true, status: 201, body: { ref: 'refs/heads/' + headBranch } };
    }
    if (path === '/repos/acme/widgets/git/blobs') {
      return { ok: true, status: 201, body: { sha: 'blob-sha-' + String(calls.length) } };
    }
    if (path === '/repos/acme/widgets/git/trees') {
      return { ok: true, status: 201, body: { sha: 'new-tree-sha' } };
    }
    if (path === '/repos/acme/widgets/git/commits') {
      return { ok: true, status: 201, body: { sha: 'commit-sha' } };
    }
    if (path === '/repos/acme/widgets/git/refs/heads/' + headBranchEncoded) {
      return { ok: true, status: 200, body: { object: { sha: 'commit-sha' } } };
    }
    if (path === '/repos/acme/widgets/pulls') {
      return {
        ok: true,
        status: 201,
        body: { html_url: 'https://github.com/acme/widgets/pull/42', number: 42 },
      };
    }

    throw new Error('Unexpected path: ' + path);
  };
}

describe('createPullRequestFlow', () => {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('executes Git Data API sequence via relay proxy for dual-format siblings', async function () {
    const calls: string[] = [];
    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(
      buildHappyPathHandler(calls, BASE_HEAD, BASE_HEAD_ENCODED),
    );

    const result = await createPullRequestFlow({
      token: 'gho_testtoken',
      owner: 'acme',
      repo: 'widgets',
      baseBranch: 'main',
      headBranch: BASE_HEAD,
      commitMessage: 'fighub: drift report export',
      prTitle: 'fighub: drift report export',
      prBody: 'test body',
      files: [
        {
          path: 'docs/fighub/drift-report-2026-05-27.v1.json',
          content: '{"v":1}',
        },
        {
          path: 'docs/fighub/drift-report-2026-05-27.v1.md',
          content: '# Drift report',
        },
      ],
    });

    expect(result).toEqual({
      prUrl: 'https://github.com/acme/widgets/pull/42',
      prNumber: 42,
      headBranch: BASE_HEAD,
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
      'PATCH /repos/acme/widgets/git/refs/heads/' + BASE_HEAD_ENCODED,
      'POST /repos/acme/widgets/pulls',
    ]);
  });

  it('retries GET ref and commit once on transient 5xx', async function () {
    const calls: string[] = [];
    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(async function (
      method,
      path,
    ) {
      calls.push(method + ' ' + path);

      if (path === '/repos/acme/widgets') {
        return { ok: true, status: 200, body: { full_name: 'acme/widgets' } };
      }
      if (path === '/repos/acme/widgets/git/ref/heads/main') {
        const refAttempts = calls.filter(function (call) {
          return call === 'GET /repos/acme/widgets/git/ref/heads/main';
        }).length;
        if (refAttempts === 1) {
          return { ok: false, status: 503, body: { message: 'Service Unavailable' } };
        }
        return { ok: true, status: 200, body: { object: { sha: 'base-sha' } } };
      }
      if (path === '/repos/acme/widgets/git/commits/base-sha') {
        const commitAttempts = calls.filter(function (call) {
          return call === 'GET /repos/acme/widgets/git/commits/base-sha';
        }).length;
        if (commitAttempts === 1) {
          return { ok: false, status: 502, body: { message: 'Bad Gateway' } };
        }
        return { ok: true, status: 200, body: { tree: { sha: 'tree-sha' } } };
      }

      return buildHappyPathHandler(calls, BASE_HEAD, BASE_HEAD_ENCODED)(method, path);
    });

    const result = await createPullRequestFlow({
      token: 'gho_testtoken',
      owner: 'acme',
      repo: 'widgets',
      baseBranch: 'main',
      headBranch: BASE_HEAD,
      commitMessage: 'fighub: drift report export',
      prTitle: 'fighub: drift report export',
      prBody: 'test body',
      files: [{ path: 'docs/fighub/drift-report-2026-05-27.v1.json', content: '{"v":1}' }],
    });

    expect(result.headBranch).toBe(BASE_HEAD);
    expect(
      calls.filter(function (call) {
        return call === 'GET /repos/acme/widgets/git/ref/heads/main';
      }).length,
    ).toBe(2);
    expect(
      calls.filter(function (call) {
        return call === 'GET /repos/acme/widgets/git/commits/base-sha';
      }).length,
    ).toBe(2);
  });

  it('retries head branch creation with collision suffix on 422', async function () {
    const calls: string[] = [];
    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(async function (
      method,
      path,
      _token,
      body,
    ) {
      calls.push(method + ' ' + path);

      if (path === '/repos/acme/widgets/git/refs' && method === 'POST') {
        const ref = (body as { ref?: string }).ref;
        if (ref === 'refs/heads/' + BASE_HEAD) {
          return {
            ok: false,
            status: 422,
            body: { message: 'Reference already exists' },
          };
        }
        if (ref === 'refs/heads/' + SUFFIX_HEAD) {
          return { ok: true, status: 201, body: { ref: ref } };
        }
      }

      return buildHappyPathHandler(calls, SUFFIX_HEAD, SUFFIX_HEAD_ENCODED)(method, path);
    });

    const result = await createPullRequestFlow({
      token: 'gho_testtoken',
      owner: 'acme',
      repo: 'widgets',
      baseBranch: 'main',
      headBranch: BASE_HEAD,
      commitMessage: 'fighub: drift report export',
      prTitle: 'fighub: drift report export',
      prBody: 'test body',
      files: [{ path: 'docs/fighub/drift-report-2026-05-27.v1.json', content: '{"v":1}' }],
    });

    expect(result.headBranch).toBe(SUFFIX_HEAD);
    expect(
      calls.filter(function (call) {
        return call === 'POST /repos/acme/widgets/git/refs';
      }).length,
    ).toBe(2);
    expect(calls.indexOf('PATCH /repos/acme/widgets/git/refs/heads/' + SUFFIX_HEAD_ENCODED)).toBeGreaterThan(
      -1,
    );
  });

  it('fails with branch-exists after exhausting collision retries', async function () {
    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(async function (
      method,
      path,
    ) {
      if (path === '/repos/acme/widgets') {
        return { ok: true, status: 200, body: { full_name: 'acme/widgets' } };
      }
      if (path === '/repos/acme/widgets/git/ref/heads/main') {
        return { ok: true, status: 200, body: { object: { sha: 'base-sha' } } };
      }
      if (path === '/repos/acme/widgets/git/commits/base-sha') {
        return { ok: true, status: 200, body: { tree: { sha: 'tree-sha' } } };
      }
      if (path === '/repos/acme/widgets/git/refs' && method === 'POST') {
        return {
          ok: false,
          status: 422,
          body: { message: 'Reference already exists' },
        };
      }

      throw new Error('Unexpected path: ' + path);
    });

    await expect(
      createPullRequestFlow({
        token: 'gho_testtoken',
        owner: 'acme',
        repo: 'widgets',
        baseBranch: 'main',
        headBranch: BASE_HEAD,
        commitMessage: 'fighub: drift report export',
        prTitle: 'fighub: drift report export',
        prBody: 'test body',
        files: [{ path: 'docs/fighub/drift-report-2026-05-27.v1.json', content: '{"v":1}' }],
      }),
    ).rejects.toMatchObject({
      mapped: {
        code: 'branch-exists',
      },
    });
  });

  it('accepts GithubPRSinkContext and derives head branch from contract kind', async function () {
    const calls: string[] = [];
    vi.spyOn(relayClient, 'githubApiViaRelay').mockImplementation(
      buildHappyPathHandler(calls, BASE_HEAD, BASE_HEAD_ENCODED),
    );

    const ctx: GithubPRSinkContext = {
      files: [{ path: 'docs/fighub/drift-report-2026-05-27.v1.json', content: '{"v":1}' }],
      contractKind: 'drift-report',
      repoUrl: 'https://github.com/acme/widgets',
      options: {
        owner: 'acme',
        repo: 'widgets',
        baseBranch: 'main',
        commitMessage: 'fighub: drift report export',
      },
      figmaFileKey: 'abc123',
      figmaFileName: 'Design System',
    };

    const result = await createPullRequestFromSinkContext('gho_testtoken', ctx, {
      prBody: 'test body',
      dateUtc: new Date('2026-05-27T12:00:00Z'),
    });

    expect(result.headBranch).toBe(BASE_HEAD);
    expect(calls[0]).toBe('GET /repos/acme/widgets');
  });

  it('maps auth failures to GitHubFlowError', async function () {
    vi.spyOn(relayClient, 'githubApiViaRelay').mockResolvedValue({
      ok: false,
      status: 401,
      body: { message: 'Bad credentials' },
    });

    await expect(
      createPullRequestFlow({
        token: 'gho_testtoken',
        owner: 'acme',
        repo: 'widgets',
        baseBranch: 'main',
        headBranch: BASE_HEAD,
        commitMessage: 'fighub: drift report export',
        prTitle: 'fighub: drift report export',
        prBody: 'test body',
        files: [{ path: 'docs/fighub/drift-report-2026-05-27.v1.json', content: '{"v":1}' }],
      }),
    ).rejects.toBeInstanceOf(GitHubFlowError);
  });
});
