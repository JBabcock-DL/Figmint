import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { pluginLog } from '@/core/pluginLog';
import type { CanvasBuildResult, CanvasPageTarget, ThemeRow } from '@/core/canvas/types';
import {
  createBodyCell,
  makeTableText,
  makeThemeModeColumn,
  rehugCell,
  resolveDocStyles,
} from '@/core/canvas/lib/cells';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import {
  buildPageContent,
  findStyleGuidePage,
  restorePageContentAutoLayout,
  suspendPageContentAutoLayout,
} from '@/core/canvas/lib/pages';
import { buildTable, type TableRowDeps } from '@/core/canvas/lib/table';
import { ensureLocalVariableMap, resolveChromeVariables } from '@/core/canvas/lib/variables';
import {
  countThemeSwatches,
  projectThemeGroupsFromTokens,
  THEME_GROUP_META,
} from '@/core/canvas/projectRows/themeRows';

const CHROME_PATHS = [
  'color/border/subtle',
  'color/background/default',
  'color/background/variant',
  'color/background/content',
  'color/background/content-muted',
];

export interface ThemeCollectionIds {
  themeCollectionId: string;
  themeLightModeId: string;
  themeDarkModeId: string;
}

/** Resolve Theme collection + Light/Dark mode ids from live Figma collections. */
export async function resolveThemeCollectionIds(): Promise<ThemeCollectionIds> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let themeColl: VariableCollection | null = null;

  for (let ci = 0; ci < collections.length; ci++) {
    if (collections[ci].name === 'Theme') {
      themeColl = collections[ci];
      break;
    }
  }
  if (themeColl === null) {
    for (let ci = 0; ci < collections.length; ci++) {
      if (/theme|semantic/i.test(collections[ci].name)) {
        themeColl = collections[ci];
        break;
      }
    }
  }
  if (themeColl === null) {
    for (let ci = 0; ci < collections.length; ci++) {
      const coll = collections[ci];
      let hasLight = false;
      let hasDark = false;
      for (let mi = 0; mi < coll.modes.length; mi++) {
        const modeName = coll.modes[mi].name.trim();
        if (/^light/i.test(modeName)) {
          hasLight = true;
        }
        if (/^dark/i.test(modeName)) {
          hasDark = true;
        }
      }
      if (hasLight && hasDark) {
        themeColl = coll;
        break;
      }
    }
  }

  if (themeColl === null) {
    throw new Error('No Theme-like collection found in file');
  }

  let lightModeId = themeColl.modes[0].modeId;
  let darkModeId =
    themeColl.modes.length > 1 ? themeColl.modes[1].modeId : themeColl.modes[0].modeId;

  for (let mi = 0; mi < themeColl.modes.length; mi++) {
    const modeName = themeColl.modes[mi].name.trim();
    if (/^light/i.test(modeName)) {
      lightModeId = themeColl.modes[mi].modeId;
    }
    if (/^dark/i.test(modeName)) {
      darkModeId = themeColl.modes[mi].modeId;
    }
  }

  return {
    themeCollectionId: themeColl.id,
    themeLightModeId: lightModeId,
    themeDarkModeId: darkModeId,
  };
}

async function buildThemeRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as ThemeRow;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const mutedVar = deps.mutedVar;
  const variableMap = deps.variableMap;
  const themeCollectionId = String(deps.themeCollectionId || '');
  const themeLightModeId = String(deps.themeLightModeId || '');
  const themeDarkModeId = String(deps.themeDarkModeId || '');

  const mapped = variableMap[data.tokenPath];
  const themeVariable = mapped !== undefined ? mapped : null;

  if (data.codeSyntax.WEB === '' && data.codeSyntax.ANDROID === '' && data.codeSyntax.iOS === '') {
    pluginLog('[canvas] theme row missing codeSyntax', data.tokenPath);
  }

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (col.id === 'LIGHT') {
      const cell = await makeThemeModeColumn({
        colWidth: col.width,
        modeSlug: 'light',
        themeVariable: themeVariable,
        resolvedHex: data.resolvedHexLight,
        resolvedHsl: data.resolvedHslLight,
        docStyles: docStyles,
        contentVar: contentVar,
        mutedVar: mutedVar,
        themeCollectionId: themeCollectionId,
        modeId: themeLightModeId,
      });
      row.appendChild(cell);
      continue;
    }
    if (col.id === 'DARK') {
      const cell = await makeThemeModeColumn({
        colWidth: col.width,
        modeSlug: 'dark',
        themeVariable: themeVariable,
        resolvedHex: data.resolvedHexDark,
        resolvedHsl: data.resolvedHslDark,
        docStyles: docStyles,
        contentVar: contentVar,
        mutedVar: mutedVar,
        themeCollectionId: themeCollectionId,
        modeId: themeDarkModeId,
      });
      row.appendChild(cell);
      continue;
    }

    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'ALIAS →': {
        cell.itemSpacing = 2;
        const a1 = await makeTableText(
          'L → ' + (data.aliasLight || '—'),
          col.width,
          docStyles.Code,
          mutedVar,
        );
        const a2 = await makeTableText(
          'D → ' + (data.aliasDark || '—'),
          col.width,
          docStyles.Code,
          mutedVar,
        );
        cell.appendChild(a1);
        cell.appendChild(a2);
        break;
      }
      case 'WEB': {
        const t = await makeTableText(
          data.codeSyntax.WEB || '—',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'ANDROID': {
        const t = await makeTableText(
          data.codeSyntax.ANDROID || '—',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'iOS': {
        const t = await makeTableText(
          data.codeSyntax.iOS || '—',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      default:
        break;
    }
    rehugCell(cell);
    row.appendChild(cell);
    cell.fills = [];
  }
}

/** Step 15b — Theme page orchestrator with Light/Dark preview columns. */
export async function buildThemePage(
  tokens: TokensV1,
  target: CanvasPageTarget,
): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  await loadFontsForCanvas();
  const variableMap = await ensureLocalVariableMap();
  const chromeVars = await resolveChromeVariables(CHROME_PATHS, variableMap);
  const docStyles = await resolveDocStyles();
  const themeIds = await resolveThemeCollectionIds();

  const page = findStyleGuidePage('theme', target.pageId);
  await figma.setCurrentPageAsync(page);
  const content = buildPageContent(page);
  suspendPageContentAutoLayout(content);

  const groups = projectThemeGroupsFromTokens(tokens);
  const groupKeys = Object.keys(groups);
  let tableCount = 0;

  for (let gi = 0; gi < groupKeys.length; gi++) {
    const key = groupKeys[gi];
    const tableRows = groups[key];
    if (tableRows.length === 0) {
      continue;
    }
    const meta = THEME_GROUP_META[key];
    const slug = 'theme/' + key.replace(/\//g, '-');
    const title =
      meta !== undefined
        ? meta.title
        : key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
    const caption = meta !== undefined ? meta.caption : title + ' tokens.';

    await buildTable(
      {
        slug: slug,
        tableKey: 'theme/semantic-group',
        title: title,
        caption: caption,
        rows: tableRows,
        buildRow: buildThemeRow,
        rowDeps: {
          themeCollectionId: themeIds.themeCollectionId,
          themeLightModeId: themeIds.themeLightModeId,
          themeDarkModeId: themeIds.themeDarkModeId,
        },
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  restorePageContentAutoLayout(content);

  const durationMs = Date.now() - started;
  const swatchCount = countThemeSwatches(groups);
  pluginLog('[canvas] buildThemePage done', String(durationMs) + 'ms', {
    tableCount: tableCount,
    swatchCount: swatchCount,
  });

  return {
    ok: true,
    builder: 'theme',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: tableCount,
    swatchCount: swatchCount,
    warnings: warnings,
  };
}
