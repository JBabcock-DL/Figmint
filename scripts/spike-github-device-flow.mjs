#!/usr/bin/env node
/**
 * WO-016 research spike — CLI Device Flow validation (same endpoints as plugin UI).
 * Usage: node scripts/spike-github-device-flow.mjs [--probe-api owner/repo/path]
 * Requires GITHUB_OAUTH_CLIENT_ID in .env.local or environment.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(rootDir, '.env.local');
  if (!existsSync(path)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const clientId = env.GITHUB_OAUTH_CLIENT_ID;

if (!clientId) {
  console.error('FAIL: GITHUB_OAUTH_CLIENT_ID not set (.env.local or env)');
  process.exit(1);
}

const probeArg = process.argv.find((a) => a.startsWith('--probe-api='));
const probePath = probeArg ? probeArg.slice('--probe-api='.length) : null;
const requestOnly = process.argv.includes('--request-only');

async function requestDeviceCode() {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }
  return body;
}

async function pollOnce(deviceCode) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  return response.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeContentsApi(token, spec) {
  const url = `https://api.github.com/repos/${spec}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, bodyPreview: text.slice(0, 200) };
}

console.log('SPK-016-0 CLI: requesting device code…');
const device = await requestDeviceCode();

if (device.error) {
  console.error('FAIL device/code:', device);
  process.exit(1);
}

console.log('PASS device/code — user_code:', device.user_code);
console.log('Open:', device.verification_uri);

if (requestOnly) {
  console.log('PASS SPK-016-0 (--request-only): OAuth app + Device Flow enabled');
  process.exit(0);
}

console.log('Waiting for you to authorize in the browser (polling every', device.interval, 's)…');

const deadline = Date.now() + (device.expires_in ?? 900) * 1000;
let intervalMs = (device.interval ?? 5) * 1000;
let token = null;

while (Date.now() < deadline) {
  const result = await pollOnce(device.device_code);
  if (result.access_token) {
    token = result.access_token;
    console.log('PASS access_token — scope:', result.scope, 'type:', result.token_type);
    break;
  }
  if (result.error === 'slow_down') {
    intervalMs = ((result.interval ?? 5) + 5) * 1000;
    console.log('slow_down — interval now', intervalMs / 1000, 's');
  } else if (result.error === 'authorization_pending') {
    process.stdout.write('.');
  } else {
    console.error('\nFAIL poll:', result);
    process.exit(1);
  }
  await sleep(intervalMs);
}

if (!token) {
  console.error('\nFAIL: timed out before authorization');
  process.exit(1);
}

console.log('\nToken preview:', token.slice(0, 8) + '…');

if (probePath) {
  console.log('SPK-016-3 probe GET contents:', probePath);
  const probe = await probeContentsApi(token, probePath);
  console.log(probe.ok ? 'PASS' : 'FAIL', 'HTTP', probe.status, probe.bodyPreview);
  process.exit(probe.ok ? 0 : 1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(
  'Optional: probe repo path as owner/repo/path/to/file.json (Enter to skip): ',
  async (answer) => {
    rl.close();
    if (!answer.trim()) {
      console.log(
        'Done. Run Figma spike (SPK-016-1/2) next — see research/spike-github-oauth-results.md',
      );
      process.exit(0);
    }
    const probe = await probeContentsApi(token, answer.trim());
    console.log(probe.ok ? 'PASS' : 'FAIL', 'HTTP', probe.status);
    process.exit(probe.ok ? 0 : 1);
  },
);
