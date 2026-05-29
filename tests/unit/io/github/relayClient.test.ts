import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  githubApiViaRelay,
  probeRelayHealth,
  requestDeviceCodeViaRelay,
} from '@/io/github/relayClient';

describe('relayClient', () => {
  afterEach(function () {
    vi.unstubAllGlobals();
  });

  it('requestDeviceCodeViaRelay posts scope to relay', async function () {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async function () {
        return {
          device_code: 'dc',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5,
        };
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestDeviceCodeViaRelay('repo');
    expect(result.user_code).toBe('ABCD-1234');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/oauth/device/code');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('https://github.com');
  });

  it('githubApiViaRelay posts proxy payload', async function () {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async function () {
        return { ok: true, status: 200, body: { full_name: 'acme/widgets' } };
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await githubApiViaRelay(
      'GET',
      '/repos/acme/widgets',
      'gho_testtoken',
      undefined,
    );
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/github/api/proxy'),
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.method).toBe('GET');
    expect(body.path).toBe('/repos/acme/widgets');
    expect(body.token).toBe('gho_testtoken');
  });

  it('probeRelayHealth returns false when relay is down', async function () {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    expect(await probeRelayHealth()).toBe(false);
  });
});
