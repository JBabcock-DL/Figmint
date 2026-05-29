/** GitHub OAuth Device Authorization Grant — shared by WO-016 spike + production connect flow. */

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export type DeviceTokenPollResult =
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | {
      status: 'success';
      accessToken: string;
      scope: string;
      tokenType: string;
    }
  | { status: 'error'; error: string; description?: string };

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

function jsonHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function requestDeviceCode(
  clientId: string,
  scope: string,
): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ client_id: clientId, scope }),
  });

  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof body.error_description === 'string'
        ? body.error_description
        : typeof body.error === 'string'
          ? body.error
          : `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (
    typeof body.device_code !== 'string' ||
    typeof body.user_code !== 'string' ||
    typeof body.verification_uri !== 'string'
  ) {
    throw new Error('Invalid device code response from GitHub');
  }

  return {
    device_code: body.device_code,
    user_code: body.user_code,
    verification_uri: body.verification_uri,
    expires_in: typeof body.expires_in === 'number' ? body.expires_in : 900,
    interval: typeof body.interval === 'number' ? body.interval : 5,
  };
}

export async function pollDeviceTokenOnce(
  clientId: string,
  deviceCode: string,
): Promise<DeviceTokenPollResult> {
  const response = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: DEVICE_GRANT,
    }),
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
    const interval = typeof body.interval === 'number' ? body.interval : 5;
    return { status: 'slow_down', interval };
  }

  return {
    status: 'error',
    error,
    description: typeof body.error_description === 'string' ? body.error_description : undefined,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}
