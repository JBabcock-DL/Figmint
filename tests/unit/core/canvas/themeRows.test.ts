import { describe, expect, it } from 'vitest';

import foundationsMinimal from '@/core/canvas/__fixtures__/foundations-minimal.v1.json';
import {
  countThemeSwatches,
  projectThemeGroupsFromTokens,
} from '@/core/canvas/projectRows/themeRows';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

describe('themeRows', () => {
  it('projects background group with alias chain on Light mode', () => {
    const groups = projectThemeGroupsFromTokens(foundationsMinimal as unknown as TokensV1);
    expect(groups.background).toBeDefined();
    expect(groups.background.length).toBe(1);
    const row = groups.background[0];
    expect(row.tokenPath).toBe('color/background/default');
    expect(row.aliasLight).toBe('color/neutral/100');
    expect(row.aliasDark).toBeNull();
    expect(row.resolvedHexLight).toMatch(/^#[0-9a-f]{6}$/i);
    expect(row.resolvedHexDark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(row.codeSyntax.WEB).toBe('var(--color-background-default)');
  });

  it('omits empty groups', () => {
    const groups = projectThemeGroupsFromTokens(foundationsMinimal as unknown as TokensV1);
    expect(groups.primary).toBeUndefined();
    expect(Object.keys(groups).length).toBe(1);
  });

  it('countThemeSwatches doubles rows for Light+Dark previews', () => {
    const groups = projectThemeGroupsFromTokens(foundationsMinimal as unknown as TokensV1);
    expect(countThemeSwatches(groups)).toBe(2);
  });
});
