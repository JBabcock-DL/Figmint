import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BRANCH_PATTERN,
  MAX_BRANCH_ATTEMPTS,
  buildDefaultHeadBranch,
  formatBranchPattern,
  withCollisionSuffix,
} from '@/io/github/branchName';

describe('branchName', () => {
  it('formats branch pattern tokens', () => {
    expect(formatBranchPattern(DEFAULT_BRANCH_PATTERN, 'drift-report', '2026-05-27')).toBe(
      'fighub/drift-report-2026-05-27',
    );
    expect(formatBranchPattern('custom/{contractKind}/{date}', 'tokens-dtcg', '2026-01-02')).toBe(
      'custom/tokens-dtcg/2026-01-02',
    );
  });

  it('builds default head branch from UTC date', () => {
    expect(buildDefaultHeadBranch('drift-report', new Date('2026-05-27T15:30:00Z'))).toBe(
      'fighub/drift-report-2026-05-27',
    );
    expect(buildDefaultHeadBranch('handoff-context', new Date('2026-01-02T00:00:00Z'))).toBe(
      'fighub/handoff-context-2026-01-02',
    );
  });

  it('appends collision suffix on retry attempts', () => {
    const branch = 'fighub/drift-report-2026-05-27';
    expect(withCollisionSuffix(branch, 0)).toBe(branch);
    expect(withCollisionSuffix(branch, 1)).toBe('fighub/drift-report-2026-05-27-2');
    expect(withCollisionSuffix(branch, 2)).toBe('fighub/drift-report-2026-05-27-3');
  });

  it('caps branch collision retries at five attempts', () => {
    expect(MAX_BRANCH_ATTEMPTS).toBe(5);
  });
});
