import { afterEach, describe, expect, it, vi } from 'vitest';

import { pollDeviceFlow, startDeviceFlow } from '@/io/github/oauth';

describe('oauth', () => {
  afterEach(function () {
    vi.unstubAllGlobals();
  });

  it('startDeviceFlow delegates to relay device code endpoint', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
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
      }),
    );

    const result = await startDeviceFlow('repo');
    expect(result.device_code).toBe('dc');
  });

  it('pollDeviceFlow returns pending from relay', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async function () {
          return { error: 'authorization_pending' };
        },
      }),
    );

    const result = await pollDeviceFlow('dc');
    expect(result.status).toBe('pending');
  });
});
