import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchFigHubConfigFromRepo } from '@/io/github/repoSync';
import * as contents from '@/io/github/contents';
import * as relay from '@/io/github/relayClient';
import { GitHubNotFoundError } from '@/io/github/contents';

describe('fetchFigHubConfigFromRepo', () => {
  beforeEach(function () {
    vi.restoreAllMocks();
  });

  it('uses defaults when fighub.json is missing', async function () {
    vi.spyOn(relay, 'githubApiViaRelay').mockResolvedValue({
      status: 200,
      ok: true,
      body: { default_branch: 'main' },
    });
    vi.spyOn(contents, 'fetchRepoFileContents').mockRejectedValue(
      new GitHubNotFoundError('missing'),
    );

    const result = await fetchFigHubConfigFromRepo('token', 'acme', 'widgets');
    expect(result.resolvedConfig.tokensPath).toBe('design/tokens.json');
    expect(result.resolvedConfig.specsPath).toBe('components/');
    expect(result.warning).toBeUndefined();
  });

  it('sets warning when fighub.json is malformed', async function () {
    vi.spyOn(relay, 'githubApiViaRelay').mockResolvedValue({
      status: 200,
      ok: true,
      body: { default_branch: 'main' },
    });
    vi.spyOn(contents, 'fetchRepoFileContents').mockResolvedValue({
      text: '{ "v": 2 }',
      sha: 'abc',
    });

    const result = await fetchFigHubConfigFromRepo('token', 'acme', 'widgets');
    expect(result.warning).toContain('version');
    expect(result.resolvedConfig.tokensPath).toBe('design/tokens.json');
  });
});
