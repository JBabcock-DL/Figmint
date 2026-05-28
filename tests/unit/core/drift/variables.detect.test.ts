import { describe, expect, it } from 'vitest';

import { detectVariableDrift } from '@/core/drift/variables';
import type { VariableComparable, VariableDriftDetectInput } from '@/core/drift/types';

import acFixture from '../../../fixtures/drift/variable-drift-ac-10.v1.json';

interface AcFixture {
  input: VariableDriftDetectInput;
  expected: {
    driftCount: number;
    syncedCount: number;
    directions: Record<string, string>;
  };
}

describe('detectVariableDrift', () => {
  it('matches AC fixture counts and directions', () => {
    const fixture = acFixture as AcFixture;
    const result = detectVariableDrift(fixture.input);

    expect(result.drifts).toHaveLength(fixture.expected.driftCount);
    expect(result.syncedCount).toBe(fixture.expected.syncedCount);

    const directionById: Record<string, string> = {};
    for (let i = 0; i < result.drifts.length; i++) {
      directionById[result.drifts[i].id] = result.drifts[i].direction;
    }
    expect(directionById).toEqual(fixture.expected.directions);
  });

  it('detects 400 keys in under 100ms', () => {
    const figmaTokens: Record<string, VariableComparable> = {};
    const repoTokens: Record<string, VariableComparable> = {};
    const snapshotTokens: Record<string, VariableComparable> = {};

    for (let i = 0; i < 400; i++) {
      const key = 'Layout/bench-' + String(i);
      figmaTokens[key] = {
        resolvedType: 'FLOAT',
        valuesByMode: { Default: i },
        codeSyntax: {},
      };
      repoTokens[key] = {
        resolvedType: 'FLOAT',
        valuesByMode: { Default: i },
        codeSyntax: {},
      };
      snapshotTokens[key] = {
        resolvedType: 'FLOAT',
        valuesByMode: { Default: i },
        codeSyntax: {},
      };
    }

    const start = performance.now();
    const result = detectVariableDrift({ figmaTokens, repoTokens, snapshotTokens });
    const elapsed = performance.now() - start;

    expect(result.syncedCount).toBe(400);
    expect(result.drifts).toHaveLength(0);
    expect(elapsed).toBeLessThan(100);
  });
});
