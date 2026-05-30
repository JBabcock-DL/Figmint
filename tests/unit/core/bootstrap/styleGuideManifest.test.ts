import { describe, expect, it } from 'vitest';

import { STYLE_GUIDE_PAGES } from '@/core/bootstrap/styleGuideManifest';
import type { StyleGuidePageSlug } from '@/core/canvas/types';

const EXPECTED_SLUGS: StyleGuidePageSlug[] = [
  'primitives',
  'theme',
  'layout',
  'text-styles',
  'effects',
];

describe('styleGuideManifest', () => {
  it('lists all five style-guide pages in build order', () => {
    expect(STYLE_GUIDE_PAGES.length).toBe(5);
    const slugs = STYLE_GUIDE_PAGES.map(function (entry) {
      return entry.pageSlug;
    });
    expect(slugs).toEqual(EXPECTED_SLUGS);
  });

  it('uses legacy display titles matching canvas page resolution', () => {
    for (let i = 0; i < STYLE_GUIDE_PAGES.length; i++) {
      const entry = STYLE_GUIDE_PAGES[i];
      expect(entry.legacyNames.length).toBeGreaterThan(0);
      expect(entry.displayTitle).toBe(entry.legacyNames[0]);
    }
  });
});
