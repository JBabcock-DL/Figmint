/// <reference types="@figma/plugin-typings" />

import { findStyleGuidePage } from '@/core/canvas/lib/pages';
import type { StyleGuidePageSlug } from '@/core/canvas/types';

import { publishMissingEffectStyles } from '@/core/bootstrap/publishEffectStyles';
import {
  DESIGNOPS_PAGE_SLUG_KEY,
  DESIGNOPS_SHARED_NS,
  STYLE_GUIDE_PAGES,
  type StyleGuidePageDef,
} from '@/core/bootstrap/styleGuideManifest';

export interface StyleGuideScaffoldResult {
  pagesCreated: string[];
  pagesReused: string[];
  effectStylesPublished: string[];
}

function tryFindStyleGuidePage(slug: StyleGuidePageSlug): PageNode | null {
  try {
    return findStyleGuidePage(slug);
  } catch {
    return null;
  }
}

function createStyleGuidePage(def: StyleGuidePageDef): PageNode {
  const page = figma.createPage();
  page.name = def.displayTitle;
  page.setSharedPluginData(DESIGNOPS_SHARED_NS, DESIGNOPS_PAGE_SLUG_KEY, def.pageSlug);
  return page;
}

/** Ensure style-guide pages exist and publish missing effect styles. */
export async function ensureStyleGuideScaffold(): Promise<StyleGuideScaffoldResult> {
  const pagesCreated: string[] = [];
  const pagesReused: string[] = [];

  for (let pi = 0; pi < STYLE_GUIDE_PAGES.length; pi++) {
    const def = STYLE_GUIDE_PAGES[pi];
    const existing = tryFindStyleGuidePage(def.pageSlug);
    if (existing !== null) {
      pagesReused.push(def.pageSlug);
      continue;
    }
    createStyleGuidePage(def);
    pagesCreated.push(def.pageSlug);
  }

  const effectResult = await publishMissingEffectStyles();

  return {
    pagesCreated: pagesCreated,
    pagesReused: pagesReused,
    effectStylesPublished: effectResult.published,
  };
}
