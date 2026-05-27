import type { StyleGuidePageSlug } from '@/core/canvas/types';

/** Shared plugin data namespace (matches DesignOps foundations shell). */
export const DESIGNOPS_SHARED_NS = 'labs.designops';
export const DESIGNOPS_PAGE_SLUG_KEY = 'pageSlug';

export interface StyleGuidePageDef {
  pageSlug: StyleGuidePageSlug;
  displayTitle: string;
  legacyNames: string[];
  headerTitle: string;
  headerDescription: string;
}

/** Style-guide pages required before canvas builders run. */
export const STYLE_GUIDE_PAGES: StyleGuidePageDef[] = [
  {
    pageSlug: 'primitives',
    displayTitle: '↳ Primitives',
    legacyNames: ['↳ Primitives'],
    headerTitle: 'Primitives',
    headerDescription: 'Raw color ramps, spacing scale, corner radius scale, and elevation values.',
  },
  {
    pageSlug: 'theme',
    displayTitle: '↳ Theme',
    legacyNames: ['↳ Theme'],
    headerTitle: 'Theme',
    headerDescription: 'Semantic color tokens — light and dark mode aliases into Primitives.',
  },
  {
    pageSlug: 'layout',
    displayTitle: '↳ Layout',
    legacyNames: ['↳ Layout'],
    headerTitle: 'Layout',
    headerDescription: 'Space and radius semantic tokens wired to the spacing and corner scale.',
  },
  {
    pageSlug: 'text-styles',
    displayTitle: '↳ Text Styles',
    legacyNames: ['↳ Text Styles'],
    headerTitle: 'Text Styles',
    headerDescription: 'Typography scale — Display, Headline, Title, Body, and Label slots.',
  },
  {
    pageSlug: 'effects',
    displayTitle: '↳ Effects',
    legacyNames: ['↳ Effects'],
    headerTitle: 'Effects',
    headerDescription: 'Shadow and elevation tokens — light and dark mode opacity variants.',
  },
  {
    pageSlug: 'token-overview',
    displayTitle: '↳ Token Overview',
    legacyNames: ['↳ Token Overview'],
    headerTitle: 'Token Overview',
    headerDescription: 'Architecture overview and platform codeSyntax mapping table.',
  },
];

export const TOKEN_OVERVIEW_ARCH_BOXES = [
  'Primitives',
  'Theme',
  'Typography',
  'Layout',
  'Effects',
] as const;
