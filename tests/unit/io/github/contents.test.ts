import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRepoFileContents, GitHubAuthError, GitHubNotFoundError } from '@/io/github/contents';
import * as relayClient from '@/io/github/relayClient';

describe('contents', () => {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('decodes base64 GitHub contents payload', async function () {
    const encoded = btoa('{"v":1,"kind":"tokens"}');
    vi.spyOn(relayClient, 'githubApiViaRelay').mockResolvedValue({
      ok: true,
      status: 200,
      body: { content: encoded + '\n', sha: 'abc123' },
    });

    const result = await fetchRepoFileContents('token', 'acme', 'widgets', 'design/tokens.json');
    expect(result.text).toBe('{"v":1,"kind":"tokens"}');
    expect(result.sha).toBe('abc123');
  });

  it('maps 401 to GitHubAuthError', async function () {
    vi.spyOn(relayClient, 'githubApiViaRelay').mockResolvedValue({
      ok: false,
      status: 401,
      body: { message: 'Bad credentials' },
    });

    await expect(
      fetchRepoFileContents('token', 'acme', 'widgets', 'design/tokens.json'),
    ).rejects.toBeInstanceOf(GitHubAuthError);
  });

  it('maps 404 to GitHubNotFoundError', async function () {
    vi.spyOn(relayClient, 'githubApiViaRelay').mockResolvedValue({
      ok: false,
      status: 404,
      body: { message: 'Not Found' },
    });

    await expect(
      fetchRepoFileContents('token', 'acme', 'widgets', 'missing.json'),
    ).rejects.toBeInstanceOf(GitHubNotFoundError);
  });
});
