import { describe, expect, it } from 'vitest';

import {
  buildFigHubConfigRow,
  runDocPipelinePreflightRules,
} from '@/core/audit/rules/doc-required-tokens';

describe('doc-pipeline/fighub-config', () => {
  it('passes when no parse error', function () {
    const row = buildFigHubConfigRow(undefined);
    expect(row.pass).toBe(true);
    expect(row.ruleId).toBe('doc-pipeline/fighub-config');
  });

  it('fails when fighub.json malformed', function () {
    const row = buildFigHubConfigRow('fighub.json version must be 1.');
    expect(row.pass).toBe(false);
  });

  it('includes fighub-config row in preflight rules', function () {
    const rows = runDocPipelinePreflightRules({
      themeVariables: [],
      typographyVariables: [],
      textStyles: [],
      fighubConfigParseError: 'bad json',
    });
    const configRow = rows.find(function (r) {
      return r.ruleId === 'doc-pipeline/fighub-config';
    });
    expect(configRow).toBeDefined();
    expect(configRow!.pass).toBe(false);
  });
});
