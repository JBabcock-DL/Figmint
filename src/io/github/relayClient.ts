/**
 * WO-016 — fetch GitHub OAuth/API via HTTPS relay (CORS-safe from Figma sandbox).
 * Production uses FIGHUB_OAUTH_RELAY_URL; dev defaults to localhost:8787.
 */

import type { DeviceCodeResponse, DeviceTokenPollResult } from '@/io/github/deviceFlow';

const DEFAULT_RELAY = 'http://localhost:8787';

function relayBase(): string {
  const fromEnv = import.meta.env.FIGHUB_OAUTH_RELAY_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return DEFAULT_RELAY;
}

export async function requestDeviceCodeViaRelay(
  scope: string,
): Promise<DeviceCodeResponse> {
  const response = await fetch(`${relayBase()}/oauth/device/code`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Relay HTTP ${response.status}`;
    throw new Error(message);
  }
  if (
    typeof body.device_code !== 'string' ||
    typeof body.user_code !== 'string' ||
    typeof body.verification_uri !== 'string'
  ) {
    throw new Error('Invalid device code response from relay');
  }
  return {
    device_code: body.device_code,
    user_code: body.user_code,
    verification_uri: body.verification_uri,
    expires_in: typeof body.expires_in === 'number' ? body.expires_in : 900,
    interval: typeof body.interval === 'number' ? body.interval : 5,
  };
}

export async function pollDeviceTokenViaRelay(
  deviceCode: string,
): Promise<DeviceTokenPollResult> {
  const response = await fetch(`${relayBase()}/oauth/device/poll`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  const body = (await response.json()) as Record<string, unknown>;

  if (typeof body.access_token === 'string') {
    return {
      status: 'success',
      accessToken: body.access_token,
      scope: typeof body.scope === 'string' ? body.scope : '',
      tokenType: typeof body.token_type === 'string' ? body.token_type : 'bearer',
    };
  }

  const error = typeof body.error === 'string' ? body.error : 'unknown_error';

  if (error === 'authorization_pending') {
    return { status: 'pending' };
  }
  if (error === 'slow_down') {
    return {
      status: 'slow_down',
      interval: typeof body.interval === 'number' ? body.interval : 5,
    };
  }

  return {
    status: 'error',
    error,
    description:
      typeof body.error_description === 'string' ? body.error_description : undefined,
  };
}

export async function probeRelayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${relayBase()}/health`);
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

export interface GitHubRelayApiResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

export async function githubApiViaRelay(
  method: 'GET' | 'POST' | 'PATCH',
  apiPath: string,
  token: string,
  body?: unknown,
): Promise<GitHubRelayApiResponse> {
  const normalizedPath = apiPath.startsWith('/') ? apiPath : '/' + apiPath;
  const response = await fetch(`${relayBase()}/github/api/proxy`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: method,
      path: normalizedPath,
      token: token,
      body: body,
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  // GitHub API status is in the JSON body (`status`, `ok`, `body`). Older relay builds
  // incorrectly forwarded GitHub 404 as HTTP 404 — still parse when the envelope is present.
  if (typeof payload.status === 'number' && 'body' in payload) {
    return {
      status: payload.status,
      ok: payload.ok === true,
      body: payload.body,
    };
  }

  if (!response.ok) {
    const message =
      typeof payload.error === 'string' ? payload.error : `Relay HTTP ${response.status}`;
    throw new Error(message);
  }

  return {
    status: typeof payload.status === 'number' ? payload.status : response.status,
    ok: payload.ok === true,
    body: payload.body,
  };
}
