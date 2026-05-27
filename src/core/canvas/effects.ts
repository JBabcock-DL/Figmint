import { runAudit } from '@/core/audit/runAudit';
import { pluginLog } from '@/core/pluginLog';
import { CanvasBuildError } from '@/core/canvas/errors';
import { ensureEffectStyles } from '@/core/canvas/ensureEffectStyles';
import { bindPaintToVar } from '@/core/canvas/helpers/bindings';
import { resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';
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
  resolveEffectsRows,
  type ShadowColorRow,
  type ShadowRow,
} from '@/core/canvas/resolveEffectsRows';
import { resolveThemeCollectionIds } from '@/core/canvas/themeTables';
import type { CanvasBuildContext, CanvasBuildResult } from '@/core/canvas/types';

const CHROME_PATHS = [
  'color/border/subtle',
  'color/background/default',
  'color/background/variant',
  'color/background/content',
  'color/background/content-muted',
  'color/background/container-highest',
  'color/background/inverse',
];

export interface EffectsCollectionIds {
  effectsCollectionId: string;
  effectsLightModeId: string;
  effectsDarkModeId: string;
}

/** Resolve Effects collection + Light/Dark mode ids from live Figma collections. */
export async function resolveEffectsCollectionIds(): Promise<EffectsCollectionIds> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let effectsColl: VariableCollection | null = null;

  for (let ci = 0; ci < collections.length; ci++) {
    if (collections[ci].name === 'Effects') {
      effectsColl = collections[ci];
      break;
    }
  }
  if (effectsColl === null) {
    for (let ci = 0; ci < collections.length; ci++) {
      if (/effects?|shadow|elevation/i.test(collections[ci].name)) {
        effectsColl = collections[ci];
        break;
      }
    }
  }
  if (effectsColl === null) {
    throw new Error('No Effects-like collection found in file');
  }

  let lightModeId = effectsColl.modes[0].modeId;
  let darkModeId =
    effectsColl.modes.length > 1 ? effectsColl.modes[1].modeId : effectsColl.modes[0].modeId;

  for (let mi = 0; mi < effectsColl.modes.length; mi++) {
    const modeName = effectsColl.modes[mi].name.trim();
    if (/^light/i.test(modeName)) {
      lightModeId = effectsColl.modes[mi].modeId;
    }
    if (/^dark/i.test(modeName)) {
      darkModeId = effectsColl.modes[mi].modeId;
    }
  }

  return {
    effectsCollectionId: effectsColl.id,
    effectsLightModeId: lightModeId,
    effectsDarkModeId: darkModeId,
  };
}

interface ShadowPreviewDeps {
  effectsCollectionId: string;
  effectsLightModeId: string;
  effectsDarkModeId: string;
  themeCollectionId: string;
  themeLightModeId: string;
  themeDarkModeId: string;
}

async function makeShadowPreviewCell(
  colWidth: number,
  tier: string,
  useDark: boolean,
  cardBgVar: Variable | null,
  cellTintVar: Variable | null,
  deps: ShadowPreviewDeps,
): Promise<FrameNode> {
  const cell = createBodyCell(colWidth, 'HORIZONTAL', useDark ? 'dark' : 'light');
  cell.counterAxisAlignItems = 'CENTER';
  cell.paddingLeft = 0;
  cell.paddingRight = 0;
  cell.paddingTop = 12;
  cell.paddingBottom = 12;
  cell.fills = [];
  if (cellTintVar !== null) {
    bindPaintToVar(cell, cellTintVar);
  }

  const card = figma.createFrame();
  card.name = 'shadow-preview/' + (useDark ? 'dark' : 'light');
  card.layoutMode = 'HORIZONTAL';
  resizeThenApplySizing(card, 88, 88, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
  });
  card.cornerRadius = 8;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  if (cardBgVar !== null) {
    bindPaintToVar(card, cardBgVar);
  }

  const styles = await figma.getLocalEffectStylesAsync();
  let styleId = '';
  for (let si = 0; si < styles.length; si++) {
    if (styles[si].name === 'Effect/shadow-' + tier) {
      styleId = styles[si].id;
      break;
    }
  }
  if (styleId === '') {
    const pattern = new RegExp('shadow.*' + tier, 'i');
    for (let si = 0; si < styles.length; si++) {
      if (pattern.test(styles[si].name)) {
        styleId = styles[si].id;
        break;
      }
    }
  }
  if (styleId !== '') {
    card.effectStyleId = styleId;
  }

  const effectsModeId = useDark ? deps.effectsDarkModeId : deps.effectsLightModeId;
  const themeModeId = useDark ? deps.themeDarkModeId : deps.themeLightModeId;
  if (deps.effectsCollectionId !== '' && effectsModeId !== '') {
    try {
      card.setExplicitVariableModeForCollection(deps.effectsCollectionId, effectsModeId);
    } catch {
      /* foreign files */
    }
  }
  if (deps.themeCollectionId !== '' && themeModeId !== '') {
    try {
      card.setExplicitVariableModeForCollection(deps.themeCollectionId, themeModeId);
    } catch {
      /* foreign files */
    }
  }

  cell.appendChild(card);
  rehugCell(cell);
  return cell;
}

async function buildShadowTierRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as ShadowRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const mutedVar = deps.mutedVar;
  const tier = data.tier || 'sm';
  const bgDefaultVar = variables['color/background/default'];
  const cellTintVar =
    variables['color/background/container-highest'] !== undefined &&
    variables['color/background/container-highest'] !== null
      ? variables['color/background/container-highest']
      : variables['color/background/variant'];

  const previewDeps: ShadowPreviewDeps = {
    effectsCollectionId: String(deps.effectsCollectionId || ''),
    effectsLightModeId: String(deps.effectsLightModeId || ''),
    effectsDarkModeId: String(deps.effectsDarkModeId || ''),
    themeCollectionId: String(deps.themeCollectionId || ''),
    themeLightModeId: String(deps.themeLightModeId || ''),
    themeDarkModeId: String(deps.themeDarkModeId || ''),
  };

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (col.id === 'LIGHT' || col.id === 'DARK') {
      const cell = await makeShadowPreviewCell(
        col.width,
        tier,
        col.id === 'DARK',
        bgDefaultVar !== undefined ? bgDefaultVar : null,
        cellTintVar !== undefined ? cellTintVar : null,
        previewDeps,
      );
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
      case 'BLUR': {
        const t = await makeTableText(
          String(data.blurPx) + 'px',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'ALIAS →': {
        const t = await makeTableText(data.aliasPath || '—', col.width, docStyles.Code, mutedVar);
        cell.appendChild(t);
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

async function buildShadowColorRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as ShadowColorRow;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const mutedVar = deps.mutedVar;
  const variableMap = deps.variableMap;
  const shadowColorVar = variableMap[data.tokenPath];
  const effectsCollectionId = String(deps.effectsCollectionId || '');
  const effectsLightModeId = String(deps.effectsLightModeId || '');
  const effectsDarkModeId = String(deps.effectsDarkModeId || '');

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (col.id === 'LIGHT') {
      const cell = await makeThemeModeColumn({
        colWidth: col.width,
        modeSlug: 'light',
        themeVariable: shadowColorVar !== undefined ? shadowColorVar : null,
        resolvedHex: data.lightRgba,
        docStyles: docStyles,
        contentVar: contentVar,
        mutedVar: mutedVar,
        themeCollectionId: effectsCollectionId,
        modeId: effectsLightModeId,
      });
      row.appendChild(cell);
      continue;
    }
    if (col.id === 'DARK') {
      const cell = await makeThemeModeColumn({
        colWidth: col.width,
        modeSlug: 'dark',
        themeVariable: shadowColorVar !== undefined ? shadowColorVar : null,
        resolvedHex: data.darkRgba,
        docStyles: docStyles,
        contentVar: contentVar,
        mutedVar: mutedVar,
        themeCollectionId: effectsCollectionId,
        modeId: effectsDarkModeId,
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

/** Step 15c — ↳ Effects page (shadow tiers + shadow color tables). */
export async function buildEffectsPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  const styleCheck = await ensureEffectStyles();
  if (styleCheck.missing.length > 0) {
    throw new CanvasBuildError(
      'Effect styles missing before buildEffectsPage. Required: ' + styleCheck.missing.join(', '),
      styleCheck.missing,
    );
  }

  await loadFontsForCanvas();
  const variableMap = await ensureLocalVariableMap();
  const chromeVars = await resolveChromeVariables(CHROME_PATHS, variableMap);
  const docStyles = await resolveDocStyles();
  const effectsIds = await resolveEffectsCollectionIds();
  const themeIds = await resolveThemeCollectionIds();

  const page = findStyleGuidePage('effects', ctx.pageId);
  await figma.setCurrentPageAsync(page);

  const liveSnapshot = Object.keys(variableMap).map(function (name) {
    const variable = variableMap[name];
    return {
      id: variable.id,
      name: variable.name,
      collectionId: variable.variableCollectionId,
      collectionName: '',
      resolvedType: variable.resolvedType,
      valuesByMode: variable.valuesByMode,
      codeSyntax: variable.codeSyntax as Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
    };
  });

  const resolved = resolveEffectsRows(ctx.tokens, liveSnapshot);
  const shadowRows = resolved.shadows;
  const colorRows = resolved.shadowColor !== null ? [resolved.shadowColor] : [];

  const content = buildPageContent(page);
  suspendPageContentAutoLayout(content);

  const rowDeps = {
    effectsCollectionId: effectsIds.effectsCollectionId,
    effectsLightModeId: effectsIds.effectsLightModeId,
    effectsDarkModeId: effectsIds.effectsDarkModeId,
    themeCollectionId: themeIds.themeCollectionId,
    themeLightModeId: themeIds.themeLightModeId,
    themeDarkModeId: themeIds.themeDarkModeId,
  };

  await buildTable(
    {
      slug: 'effects/shadows',
      tableKey: 'effects/shadows',
      title: 'Shadows',
      caption: 'Drop shadow tiers — each alias points to an Elevation primitive.',
      rows: shadowRows,
      buildRow: buildShadowTierRow,
      rowDeps: rowDeps,
    },
    content,
    chromeVars,
    docStyles,
    variableMap,
  );

  await buildTable(
    {
      slug: 'effects/color',
      tableKey: 'effects/color',
      title: 'Shadow Color',
      caption: 'Shared shadow color referenced by every tier.',
      rows: colorRows,
      buildRow: buildShadowColorRow,
      rowDeps: rowDeps,
    },
    content,
    chromeVars,
    docStyles,
    variableMap,
  );

  restorePageContentAutoLayout(content);

  const durationMs = Date.now() - started;
  const audit = await runAudit('canvas', {
    builder: 'effects',
    page: page,
    stats: {
      shadowRows: shadowRows.length,
      shadowColorRows: colorRows.length,
    },
  });

  pluginLog('[canvas] buildEffectsPage done', String(durationMs) + 'ms', {
    shadowRows: shadowRows.length,
    shadowColorRows: colorRows.length,
    auditPassed: audit.passed,
  });

  return {
    ok: audit.passed,
    builder: 'effects',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: 2,
    swatchCount: shadowRows.length + colorRows.length,
    warnings: warnings,
    audit: audit,
    stats: {
      shadowRows: shadowRows.length,
      shadowColorRows: colorRows.length,
    },
  };
}
