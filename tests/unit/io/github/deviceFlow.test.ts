import { describe, expect, it, vi, afterEach } from 'vitest';

import { pollDeviceTokenOnce, requestDeviceCode } from '@/io/github/deviceFlow';

describe('deviceFlow', () => {
  afterEach(function () {
    vi.unstubAllGlobals();
  });

  it('requestDeviceCode posts client_id and scope', async function () {
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

    const result = await requestDeviceCode('client-id', 'repo');

    expect(result.user_code).toBe('ABCD-1234');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://github.com/login/device/code',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.client_id).toBe('client-id');
    expect(body.scope).toBe('repo');
  });

  it('pollDeviceTokenOnce returns pending', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async function () {
          return { error: 'authorization_pending' };
        },
      }),
    );

    const result = await pollDeviceTokenOnce('client-id', 'dc');
    expect(result.status).toBe('pending');
  });

  it('pollDeviceTokenOnce returns success', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async function () {
          return { access_token: 'gho_x', scope: 'repo', token_type: 'bearer' };
        },
      }),
    );

    const result = await pollDeviceTokenOnce('client-id', 'dc');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.accessToken).toBe('gho_x');
      expect(result.scope).toBe('repo');
    }
  });
});
