import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetGitHubClientStateForTests } from '@/io/github/githubUiBridge';
import { loadFromGitHub } from '@/io/sources/github';

const SAMPLE_JSON = JSON.stringify({
  v: 1,
  kind: 'ops-program',
  steps: [],
});

describe('loadFromGitHub', () => {
  afterEach(function () {
    resetGitHubClientStateForTests();
    vi.restoreAllMocks();
  });

  it('loads tokens JSON from mocked contents response', async function () {
    const postMessage = vi.fn();
    vi.stubGlobal('parent', { postMessage: postMessage });

    const promise = loadFromGitHub('https://github.com/acme/widgets', 'design/tokens.json');

    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.mock.calls[0][0].pluginMessage;
    expect(payload.type).toBe('github/contents/fetch');

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'github/contents/result',
            requestId: payload.requestId,
            text: SAMPLE_JSON,
            sha: 'abc123',
          },
        },
      }),
    );

    const result = await promise;
    expect('payload' in result).toBe(true);
    if ('payload' in result) {
      expect(result.kind).toBe('ops-program');
      expect(result.sourceMeta.port).toBe('github');
      if (result.sourceMeta.port === 'github') {
        expect(result.sourceMeta.path).toBe('design/tokens.json');
        expect(result.sourceMeta.sha).toBe('abc123');
      }
    }
  });

  it('rejects unsafe repo paths', async function () {
    const result = await loadFromGitHub('https://github.com/acme/widgets', '../secrets.json');
    expect('kind' in result && result.kind).toBe('unsupported-type');
  });
});
