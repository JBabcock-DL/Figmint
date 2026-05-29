import { describe, expect, it } from 'vitest';

import {
  FIGHUB_JSON_DEFAULTS,
  parseFigHubJson,
  resolveFigHubConfig,
} from '@/io/formats/fighubJson';

describe('fighubJson', () => {
  it('parses valid fighub.json', () => {
    const result = parseFigHubJson(
      JSON.stringify({
        v: 1,
        kind: 'fighub-config',
        tokensPath: 'custom/tokens.json',
        specsPath: 'specs/',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tokensPath).toBe('custom/tokens.json');
      expect(result.value.specsPath).toBe('specs/');
    }
  });

  it('uses defaults when parsed value is null', () => {
    const resolved = resolveFigHubConfig(null, 'main');
    expect(resolved.tokensPath).toBe(FIGHUB_JSON_DEFAULTS.tokensPath);
    expect(resolved.specsPath).toBe(FIGHUB_JSON_DEFAULTS.specsPath);
    expect(resolved.exportBasePath).toBe(FIGHUB_JSON_DEFAULTS.exportBasePath);
    expect(resolved.designSystemBranch).toBe('main');
  });

  it('fails malformed v2', () => {
    const result = parseFigHubJson(JSON.stringify({ v: 2, kind: 'fighub-config' }));
    expect(result.ok).toBe(false);
  });

  it('allows extra keys on valid document', () => {
    const result = parseFigHubJson(
      JSON.stringify({ v: 1, kind: 'fighub-config', futureField: true }),
    );
    expect(result.ok).toBe(true);
  });
});
