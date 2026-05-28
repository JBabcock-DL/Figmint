import { describe, expect, it } from 'vitest';

import { buildDriftReportPrTitle } from '@/io/github/prBody';

describe('buildDriftReportPrTitle', () => {
  it('formats drift summary title', () => {
    expect(
      buildDriftReportPrTitle({ push: 4, pull: 2, conflict: 1, synced: 410 }),
    ).toBe('DesignOps drift: 4 push, 2 pull, 1 conflicts');
  });
});
