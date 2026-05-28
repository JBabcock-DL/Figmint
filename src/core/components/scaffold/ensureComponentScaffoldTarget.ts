/// <reference types="@figma/plugin-typings" />

import { TABLE_WIDTH } from '@/core/canvas/constants';
import { resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';
import { buildPageContent } from '@/core/canvas/lib/pages';

import {
  docComponentRootName,
  resolveComponentPageName,
  specNameToDocKey,
} from './componentPageRouting';

export { specNameToDocKey };

export interface ComponentScaffoldTarget {
  page: PageNode;
  pageName: string;
  content: FrameNode;
  docRoot: FrameNode;
  docKey: string;
}

function listRootPages(): PageNode[] {
  const pages: PageNode[] = [];
  for (let i = 0; i < figma.root.children.length; i++) {
    const child = figma.root.children[i];
    if (child.type === 'PAGE') {
      pages.push(child);
    }
  }
  return pages;
}

export function findPageByExactName(name: string): PageNode | null {
  const pages = listRootPages();
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].name === name) {
      return pages[i];
    }
  }
  return null;
}

export function getOrCreatePageContent(page: PageNode): FrameNode {
  for (let i = 0; i < page.children.length; i++) {
    const child = page.children[i];
    if (child.type === 'FRAME' && child.name === '_PageContent') {
      return child;
    }
  }
  return buildPageContent(page);
}

export function ensureDocComponentRoot(content: FrameNode, docKey: string): FrameNode {
  const rootName = docComponentRootName(docKey);
  for (let i = 0; i < content.children.length; i++) {
    const child = content.children[i];
    if (child.type === 'FRAME' && child.name === rootName) {
      return child;
    }
  }

  const docRoot = figma.createFrame();
  docRoot.name = rootName;
  docRoot.layoutMode = 'VERTICAL';
  docRoot.itemSpacing = 48;
  resizeThenApplySizing(docRoot, TABLE_WIDTH, 1, {
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
  });
  content.appendChild(docRoot);
  docRoot.layoutSizingVertical = 'HUG';
  return docRoot;
}

/**
 * Resolve the Foundations component page (`↳ Buttons`, …), ensure `_PageContent`,
 * and the `doc/component/{kebab}` root frame per DesignOps doc-pipeline contract.
 */
export function ensureComponentScaffoldTarget(specName: string): ComponentScaffoldTarget {
  const pageName = resolveComponentPageName(specName);
  const docKey = specNameToDocKey(specName);

  let page = findPageByExactName(pageName);
  if (page === null) {
    page = figma.createPage();
    page.name = pageName;
  }

  const content = getOrCreatePageContent(page);
  const docRoot = ensureDocComponentRoot(content, docKey);

  return {
    page: page,
    pageName: pageName,
    content: content,
    docRoot: docRoot,
    docKey: docKey,
  };
}

/**
 * Place `doc/component/{key}` on an existing page (tests / rescaffold on a known page).
 * Does not create or rename pages — use `ensureComponentScaffoldTarget` in production.
 */
export function ensureDocOnPage(page: PageNode, specName: string): ComponentScaffoldTarget {
  const docKey = specNameToDocKey(specName);
  const content = getOrCreatePageContent(page);
  const docRoot = ensureDocComponentRoot(content, docKey);
  return {
    page: page,
    pageName: page.name,
    content: content,
    docRoot: docRoot,
    docKey: docKey,
  };
}

/** @deprecated Use `ensureComponentScaffoldTarget` — flat `Components` page is not Foundations-correct. */
export function ensureComponentsPage(): PageNode {
  return ensureComponentScaffoldTarget('Button').page;
}
