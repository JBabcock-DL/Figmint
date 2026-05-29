/// <reference types="@figma/plugin-typings" />

import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { getColumnSpec } from '@/core/canvas/helpers/columnSpec';
import {
  createBodyCell,
  createBodyRow,
  reassertBodyCell,
  reassertBodyRow,
} from '@/core/canvas/helpers/tableCells';
import {
  createEmptyBody,
  createHeaderRow,
  createTableGroup,
  createTableRoot,
} from '@/core/canvas/helpers/tableShell';
import { loadPlatformMappingRows } from '@/core/canvas/data/loadCanvasData';
import { makeTableText } from '@/core/canvas/lib/cells';
import { resolveTableChromeVariables } from '@/core/canvas/lib/docChromeVariables';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import { buildPageContent, findStyleGuidePage } from '@/core/canvas/lib/pages';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import type { StyleGuidePageSlug } from '@/core/canvas/types';

import { publishMissingEffectStyles } from '@/core/bootstrap/publishEffectStyles';
import {
  DESIGNOPS_PAGE_SLUG_KEY,
  DESIGNOPS_SHARED_NS,
  STYLE_GUIDE_PAGES,
  TOKEN_OVERVIEW_ARCH_BOXES,
  type StyleGuidePageDef,
} from '@/core/bootstrap/styleGuideManifest';

const PLATFORM_MAPPING_TABLE_KEY = 'token-overview/platform-mapping' as const;
const PLATFORM_MAPPING_TABLE_NAME = 'doc/table/token-overview/platform-mapping';

const COLUMN_CELL_SUFFIX: Record<string, string> = {
  TOKEN: 'token',
  WEB: 'web',
  ANDROID: 'android',
  iOS: 'ios',
};

export interface StyleGuideScaffoldResult {
  pagesCreated: string[];
  pagesReused: string[];
  effectStylesPublished: string[];
  tokenOverviewScaffolded: boolean;
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

function ensureArchitectureSection(content: FrameNode): boolean {
  const existing = content.findOne(function (node) {
    return node.name === 'token-overview/architecture';
  });
  if (existing !== null) {
    return false;
  }

  const section = figma.createFrame();
  section.name = 'token-overview/architecture';
  section.layoutMode = 'HORIZONTAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.itemSpacing = 24;
  section.fills = [];

  for (let bi = 0; bi < TOKEN_OVERVIEW_ARCH_BOXES.length; bi++) {
    const boxName = TOKEN_OVERVIEW_ARCH_BOXES[bi];
    const box = figma.createFrame();
    box.name = 'arch-box/' + boxName;
    box.resize(160, 96);
    box.cornerRadius = 12;
    box.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.97 } }];
    section.appendChild(box);
  }

  content.appendChild(section);
  return true;
}

async function ensurePlatformMappingTable(content: FrameNode): Promise<boolean> {
  const existing = content.findOne(function (node) {
    return node.name === PLATFORM_MAPPING_TABLE_NAME;
  });
  if (existing !== null) {
    return false;
  }

  const variableMap = await ensureLocalVariableMap();
  const chromeVars = resolveTableChromeVariables(variableMap);
  const contentVar = chromeVars['doc/text/primary'];
  const mutedVar = chromeVars['doc/text/muted'];
  const borderVar = chromeVars['doc/table/border'];
  const tableFill = chromeVars['doc/table/surface'];
  const headerFill = chromeVars['doc/table/header-surface'];

  const columns = getColumnSpec(PLATFORM_MAPPING_TABLE_KEY);
  const group = createTableGroup('token-overview-platform-mapping');
  const table = createTableRoot(PLATFORM_MAPPING_TABLE_KEY);
  if (borderVar !== null) {
    table.strokes = [{ type: 'SOLID', color: { r: 0.898, g: 0.898, b: 0.918 } }];
    table.strokeWeight = 1;
    bindStrokeToVar(table, borderVar);
  }
  if (tableFill !== null) {
    bindPaintToVar(table, tableFill);
  }
  createHeaderRow(table, columns, mutedVar, null);
  const header = table.findOne(function (node) {
    return node.name === 'header';
  }) as FrameNode | null;
  if (header !== null && headerFill !== null) {
    bindPaintToVar(header, headerFill);
  }
  const body = createEmptyBody(table);

  const rowDefs = loadPlatformMappingRows().rows;
  for (let ri = 0; ri < rowDefs.length; ri++) {
    const rowDef = rowDefs[ri];
    const rowPrefix = PLATFORM_MAPPING_TABLE_NAME + '/row/' + rowDef.tokenPath;
    const row = createBodyRow(rowDef.tokenPath);
    row.name = rowPrefix;

    for (let ci = 0; ci < columns.length; ci++) {
      const column = columns[ci];
      const cellSuffix = COLUMN_CELL_SUFFIX[column.id];
      if (cellSuffix === undefined) {
        continue;
      }
      const cell = createBodyCell(column.width, 'VERTICAL');
      cell.name = rowPrefix + '/cell/' + cellSuffix;
      const cellText =
        column.id === 'TOKEN'
          ? rowDef.tokenPath
          : rowDef.defaultHex !== ''
            ? rowDef.defaultHex
            : '—';
      const text = await makeTableText(cellText, column.width, null, contentVar);
      cell.appendChild(text);
      reassertBodyCell(cell);
      row.appendChild(cell);
    }

    reassertBodyRow(row);
    body.appendChild(row);
  }

  group.appendChild(table);
  content.appendChild(group);
  return true;
}

async function ensureTokenOverviewScaffold(page: PageNode): Promise<boolean> {
  await loadFontsForCanvas();

  let pageContent = page.findOne(function (node) {
    return node.name === '_PageContent';
  }) as FrameNode | null;

  if (pageContent === null) {
    pageContent = buildPageContent(page);
  }

  const archAdded = ensureArchitectureSection(pageContent);
  const tableAdded = await ensurePlatformMappingTable(pageContent);
  return archAdded || tableAdded;
}

/**
 * Ensure all six style-guide pages exist and token-overview has minimum scaffold
 * (architecture boxes + platform-mapping table). Also publishes missing effect styles.
 */
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

  const overviewPage = findStyleGuidePage('token-overview');
  const tokenOverviewScaffolded = await ensureTokenOverviewScaffold(overviewPage);

  const effectResult = await publishMissingEffectStyles();

  return {
    pagesCreated: pagesCreated,
    pagesReused: pagesReused,
    effectStylesPublished: effectResult.published,
    tokenOverviewScaffolded: tokenOverviewScaffolded,
  };
}
