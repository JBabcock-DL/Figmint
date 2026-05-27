import { describe, expect, it } from 'vitest';

import { projectTokenOverviewRows } from '@/core/canvas/projectRows/tokenOverviewRows';

describe('tokenOverviewRows', () => {
  it('syncs WEB/ANDROID/iOS from live variable codeSyntax', () => {
    const rows = projectTokenOverviewRows({
      'color/primary/default': {
        codeSyntax: {
          WEB: 'var(--color-primary-default)',
          ANDROID: 'color-primary-default',
          iOS: '.Theme.color.primary.default',
        },
      },
    });

    const primary = rows.find(function (row) {
      return row.tokenPath === 'color/primary/default';
    });
    expect(primary).toBeDefined();
    if (primary !== undefined) {
      expect(primary.variablePresent).toBe(true);
      expect(primary.codeSyntax.WEB).toBe('var(--color-primary-default)');
      expect(primary.codeSyntax.ANDROID).toBe('color-primary-default');
      expect(primary.codeSyntax.iOS).toBe('.Theme.color.primary.default');
    }
  });

  it('falls back to defaultHex and marks stale when variable missing', () => {
    const rows = projectTokenOverviewRows({});
    const missing = rows.find(function (row) {
      return row.tokenPath === 'color/background/default';
    });
    expect(missing).toBeDefined();
    if (missing !== undefined) {
      expect(missing.variablePresent).toBe(false);
      expect(missing.codeSyntax.WEB).toBe('#FBFBFB');
      expect(missing.tokenCellSuffix).toBe(' · stale');
    }
  });
});
