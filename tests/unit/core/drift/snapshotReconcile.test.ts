import { describe, expect, it } from 'vitest';

import { classifyThreeWay } from '@/core/drift/classify';
import {
  isPrematurePushSnapshot,
  resolveSnapshotForClassify,
} from '@/core/drift/snapshotReconcile';
import type { VariableComparable } from '@/core/drift/types';
import { variableStatesEqual } from '@/core/drift/variableEqual';

function comparable(value: number): VariableComparable {
  return {
    resolvedType: 'FLOAT',
    valuesByMode: { Default: value },
    codeSyntax: {},
  };
}

describe('snapshotReconcile', () => {
  it('detects premature push snapshot when figma matches snapshot but not repo', () => {
    expect(isPrematurePushSnapshot(comparable(1), comparable(0), comparable(1), 'push')).toBe(true);
    expect(isPrematurePushSnapshot(comparable(0), comparable(1), comparable(0), 'pull')).toBe(
      false,
    );
  });

  it('classifies pending push as push after ignoring premature push snapshot', () => {
    const figma = comparable(1);
    const repo = comparable(0);
    const snapshot = comparable(1);
    const baseline = resolveSnapshotForClassify(figma, repo, snapshot, 'push');
    expect(baseline).toBeNull();
    expect(classifyThreeWay(figma, repo, baseline, variableStatesEqual)).toBe('push');
    expect(classifyThreeWay(figma, repo, snapshot, variableStatesEqual)).toBe('pull');
  });

  it('treats figma-only premature push snapshot as push', () => {
    const figma = comparable(1);
    const snapshot = comparable(1);
    const baseline = resolveSnapshotForClassify(figma, null, snapshot, 'push');
    expect(baseline).toBeNull();
    expect(classifyThreeWay(figma, null, baseline, variableStatesEqual)).toBe('push');
  });
});
