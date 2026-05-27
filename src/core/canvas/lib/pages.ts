import { PAGE_CONTENT_WIDTH } from '@/core/canvas/constants';
import type { StyleGuidePageSlug } from '@/core/canvas/types';

const DESIGNOPS_SHARED_NS = 'labs.designops';
const DESIGNOPS_PAGE_SLUG_SUBKEY = 'pageSlug';

const PAGE_RESOLVE_OPTS: Record<
  StyleGuidePageSlug,
  { legacyExact: string[]; legacyRegex: RegExp[] }
> = {
  primitives: {
    legacyExact: ['↳ Primitives'],
    legacyRegex: [/primitives/i],
  },
  theme: {
    legacyExact: ['↳ Theme'],
    legacyRegex: [/^↳?\s*theme/i],
  },
  'text-styles': {
    legacyExact: ['↳ Text Styles'],
    legacyRegex: [/^↳?\s*text\s*styles/i],
  },
  'token-overview': {
    legacyExact: ['↳ Token Overview'],
    legacyRegex: [/^↳?\s*token\s*overview/i],
  },
  layout: {
    legacyExact: ['↳ Layout'],
    legacyRegex: [/^↳?\s*layout/i],
  },
  effects: {
    legacyExact: ['↳ Effects'],
    legacyRegex: [/^↳?\s*effects?/i],
  },
};

function readDesignOpsPageSlug(page: PageNode): string {
  return page.getSharedPluginData(DESIGNOPS_SHARED_NS, DESIGNOPS_PAGE_SLUG_SUBKEY) || '';
}

function listPages(): PageNode[] {
  const pages: PageNode[] = [];
  for (let i = 0; i < figma.root.children.length; i++) {
    const child = figma.root.children[i];
    if (child.type === 'PAGE') {
      pages.push(child);
    }
  }
  return pages;
}

/** Resolve style-guide page by shared slug, legacy exact name, then regex fallback. */
export function findStyleGuidePage(slug: StyleGuidePageSlug, pageId?: string): PageNode {
  if (pageId !== undefined && pageId !== '') {
    for (let i = 0; i < figma.root.children.length; i++) {
      const child = figma.root.children[i];
      if (child.type === 'PAGE' && child.id === pageId) {
        return child;
      }
    }
  }

  const pages = listPages();
  const opts = PAGE_RESOLVE_OPTS[slug];

  for (let i = 0; i < pages.length; i++) {
    if (readDesignOpsPageSlug(pages[i]) === slug) {
      return pages[i];
    }
  }

  const exactMatches: PageNode[] = [];
  for (let ei = 0; ei < opts.legacyExact.length; ei++) {
    const legacyName = opts.legacyExact[ei];
    for (let pi = 0; pi < pages.length; pi++) {
      if (pages[pi].name === legacyName) {
        exactMatches.push(pages[pi]);
      }
    }
  }
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const regexMatches: PageNode[] = [];
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    for (let ri = 0; ri < opts.legacyRegex.length; ri++) {
      if (opts.legacyRegex[ri].test(page.name)) {
        regexMatches.push(page);
        break;
      }
    }
  }
  if (regexMatches.length === 1) {
    return regexMatches[0];
  }

  throw new Error('Style-guide page not found for slug "' + slug + '"');
}

/** `_Header` or `/^header/i` instance/component — preserved during destructive redraw. */
export function isHeaderNode(node: SceneNode): boolean {
  if (node.name === '_Header') {
    return true;
  }
  if (!/^header/i.test(node.name)) {
    return false;
  }
  return node.type === 'INSTANCE' || node.type === 'COMPONENT';
}

/**
 * Delete all non-header children; create fresh `_PageContent` at y=320.
 * Idempotent full-page wipe per legacy `buildPageContent`.
 */
export function buildPageContent(page: PageNode): FrameNode {
  const children = [...page.children];
  for (let i = 0; i < children.length; i++) {
    if (!isHeaderNode(children[i])) {
      children[i].remove();
    }
  }

  for (let i = 0; i < page.children.length; i++) {
    const child = page.children[i];
    if (isHeaderNode(child) && 'width' in child) {
      const header = child as FrameNode;
      if (Math.abs(header.width - PAGE_CONTENT_WIDTH) > 1) {
        header.resize(PAGE_CONTENT_WIDTH, 320);
      }
    }
  }

  const content = figma.createFrame();
  content.name = '_PageContent';
  content.layoutMode = 'VERTICAL';
  content.primaryAxisSizingMode = 'AUTO';
  content.counterAxisSizingMode = 'FIXED';
  content.resizeWithoutConstraints(PAGE_CONTENT_WIDTH, 1);
  content.x = 0;
  content.y = 320;
  content.paddingTop = 80;
  content.paddingBottom = 80;
  content.paddingLeft = 80;
  content.paddingRight = 80;
  content.itemSpacing = 48;
  content.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  page.appendChild(content);
  content.layoutSizingVertical = 'HUG';
  return content;
}

/** C2 bulk-insert — suspend parent auto-layout during table append loop. */
export function suspendPageContentAutoLayout(content: FrameNode): void {
  content.layoutMode = 'NONE';
}

/** C2 bulk-insert — restore VERTICAL + HUG after all tables appended. */
export function restorePageContentAutoLayout(content: FrameNode): void {
  content.layoutMode = 'VERTICAL';
  content.layoutSizingVertical = 'HUG';
}
