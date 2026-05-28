#!/usr/bin/env node
/**
 * WO-016 research spike — local OAuth relay (dev only).
 *
 * GitHub OAuth/Device Flow cannot be called from Figma's sandbox (null origin CORS).
 * This relay performs server-side fetch to GitHub and exposes JSON endpoints the plugin can call.
 *
 * Usage:
 *   GITHUB_OAUTH_CLIENT_ID=... node scripts/github-oauth-relay.mjs
 *   Add manifest devAllowedDomains: ["http://localhost:8787"]
 *   Rebuild plugin, run Connect in spike panel (relay mode).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const PORT = Number(process.env.FIGMINT_OAUTH_RELAY_PORT ?? 8787);

function loadClientId() {
  const envPath = resolve(rootDir, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('GITHUB_OAUTH_CLIENT_ID=')) {
        return trimmed.slice('GITHUB_OAUTH_CLIENT_ID='.length).trim();
      }
    }
  }
  return process.env.GITHUB_OAUTH_CLIENT_ID ?? '';
}

const CLIENT_ID = loadClientId();

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function githubDeviceCode(scope) {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope }),
  });
  return response.json();
}

async function githubPollToken(deviceCode) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  return response.json();
}

async function githubApiRequest(method, path, token, body) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const init = { method, headers };
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`https://api.github.com${normalizedPath}`, init);
  const text = await response.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, ok: response.ok, body: parsed };
}

async function githubApiGet(path, token) {
  return githubApiRequest('GET', path, token);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true, clientIdConfigured: Boolean(CLIENT_ID) });
    return;
  }

  if (!CLIENT_ID) {
    sendJson(res, 500, { error: 'GITHUB_OAUTH_CLIENT_ID not set' });
    return;
  }

  if (url.pathname === '/oauth/device/code' && req.method === 'POST') {
    const body = await readBody(req);
    const scope = typeof body.scope === 'string' ? body.scope : 'repo';
    const result = await githubDeviceCode(scope);
    sendJson(res, 200, result);
    return;
  }

  if (url.pathname === '/oauth/device/poll' && req.method === 'POST') {
    const body = await readBody(req);
    if (typeof body.device_code !== 'string') {
      sendJson(res, 400, { error: 'device_code required' });
      return;
    }
    const result = await githubPollToken(body.device_code);
    sendJson(res, 200, result);
    return;
  }

  if (url.pathname === '/github/api/proxy' && req.method === 'POST') {
    const body = await readBody(req);
    const method = typeof body.method === 'string' ? body.method.toUpperCase() : 'GET';
    const path = typeof body.path === 'string' ? body.path : '';
    const token = typeof body.token === 'string' ? body.token : '';
    if (!path || !token) {
      sendJson(res, 400, { error: 'path and token required' });
      return;
    }
    if (method !== 'GET' && method !== 'POST' && method !== 'PATCH') {
      sendJson(res, 400, { error: 'unsupported method' });
      return;
    }
    const result = await githubApiRequest(method, path, token, body.body);
    sendJson(res, result.ok ? 200 : result.status, result);
    return;
  }

  if (url.pathname === '/github/api' && req.method === 'GET') {
    const token = url.searchParams.get('token');
    const path = url.searchParams.get('path');
    if (!token || !path) {
      sendJson(res, 400, { error: 'token and path query params required' });
      return;
    }
    const result = await githubApiGet(path.startsWith('/') ? path : `/${path}`, token);
    sendJson(res, result.ok ? 200 : result.status, result);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Figmint OAuth relay listening on http://localhost:${PORT}`);
  console.log(`  client_id: ${CLIENT_ID ? 'configured' : 'MISSING'}`);
  console.log('  Endpoints: POST /oauth/device/code, POST /oauth/device/poll, POST /github/api/proxy, GET /github/api');
  console.log('  Add to manifest.json devAllowedDomains: ["http://localhost:8787"]');
});

server.on('error', (error) => {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('  If you started the relay in another terminal, leave it running.');
    console.error(`  Health check: curl http://localhost:${PORT}/health`);
    console.error(`  Or use another port: FIGMINT_OAUTH_RELAY_PORT=8788 npm run spike:oauth-relay`);
    process.exit(1);
  }
  throw error;
});
