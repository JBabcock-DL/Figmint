import { describe, expect, it } from 'vitest';

import { mapGitHubHttpError, mapNetworkError } from '@/io/github/githubErrors';

describe('mapGitHubHttpError', () => {
  const cases = [
    {
      name: '401 token expired',
      status: 401,
      body: { message: 'Bad credentials' },
      context: {},
      expected: {
        code: 'auth-expired',
        message: 'GitHub authorization expired.',
        hint: 'Reconnect GitHub in Settings.',
        clearToken: true,
      },
    },
    {
      name: '403 insufficient scope',
      status: 403,
      body: { message: 'Resource not accessible by integration' },
      context: {},
      expected: {
        code: 'forbidden',
        message: 'GitHub token cannot write to this repository.',
        hint: 'Re-authorize with repo scope.',
      },
    },
    {
      name: '403 rate limit exhausted',
      status: 403,
      body: { message: 'API rate limit exceeded' },
      context: { rateLimitRemaining: 0 },
      expected: {
        code: 'network',
        message: 'GitHub rate limit reached. Try again in a few minutes.',
        hint: 'Wait and retry.',
      },
    },
    {
      name: '404 repo or branch missing',
      status: 404,
      body: { message: 'Not Found' },
      context: {},
      expected: {
        code: 'not-found',
        message: 'Repository or base branch not found.',
        hint: 'Check connected repo URL and base branch.',
      },
    },
    {
      name: '422 branch already exists',
      status: 422,
      body: { message: 'Reference already exists' },
      context: { branch: 'fighub/drift-report-2026-05-27' },
      expected: {
        code: 'branch-exists',
        message: 'A branch named `fighub/drift-report-2026-05-27` already exists.',
        hint: 'Change branch pattern or delete the remote branch.',
      },
    },
    {
      name: '409 empty repository',
      status: 409,
      body: { message: 'Git Repository is empty.' },
      context: {},
      expected: {
        code: 'conflict',
        message: 'This repository has no commits yet; cannot open a PR.',
        hint: 'Push an initial commit to the repo first.',
      },
    },
    {
      name: '409 content conflict',
      status: 409,
      body: { message: 'Update is not a fast forward' },
      context: {},
      expected: {
        code: 'conflict',
        message: 'GitHub rejected the commit (content changed on the branch).',
        hint: 'Retry export; plugin will use a new branch name.',
      },
    },
    {
      name: '503 server error',
      status: 503,
      body: { message: 'Service Unavailable' },
      context: {},
      expected: {
        code: 'network',
        message: 'GitHub is temporarily unavailable.',
        hint: 'Retry once (single backoff); then fail.',
      },
    },
  ] as const;

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    it(testCase.name, function () {
      expect(mapGitHubHttpError(testCase.status, testCase.body, testCase.context)).toEqual(
        testCase.expected,
      );
    });
  }

  it('maps fetch failures to network errors', function () {
    expect(mapNetworkError(new TypeError('Failed to fetch'))).toEqual({
      code: 'network',
      message: 'Network error reaching GitHub.',
      hint: 'Check connection and try again.',
    });
  });
});
