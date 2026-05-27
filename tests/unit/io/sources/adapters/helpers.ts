import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../src/io/sources/adapters/__fixtures__',
);

export function loadAdapterFixture(name: string): unknown {
  const raw = readFileSync(join(fixturesDir, name), 'utf8');
  const jsonText = raw.startsWith('//') ? raw.slice(raw.indexOf('\n') + 1) : raw;
  return JSON.parse(jsonText);
}

export function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeJson(entry))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      normalized[key] = normalizeJson(obj[key]);
    }
    return normalized;
  }
  return value;
}
