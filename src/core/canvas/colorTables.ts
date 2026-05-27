import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { pluginLog } from '@/core/pluginLog';
import type {
  CanvasBuildResult,
  CanvasPageTarget,
  ColorRampRow,
  PrimitiveFloatRow,
  PrimitiveStringRow,
} from '@/core/canvas/types';
import {
  createBodyCell,
  makeTableText,
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
import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { ensureLocalVariableMap, resolveChromeVariables } from '@/core/canvas/lib/variables';
import { hexToRgb } from '@/core/canvas/lib/colorFormats';
import {
  projectColorRampsFromTokens,
  projectPrimitiveFloatRows,
  projectPrimitiveStringRows,
} from '@/core/canvas/projectRows/primitivesRows';

const CHROME_PATHS = [
  'color/border/subtle',
  'color/background/default',
  'color/background/variant',
  'color/background/content',
  'color/background/content-muted',
  'color/neutral/100',
  'color/primary/200',
];

const RAMP_DEFAULTS: Record<string, { title: string; caption: string }> = {
  primary: {
    title: 'Primary',
    caption: 'Brand anchor — used for the most prominent actions, links, and focus.',
  },
  secondary: {
    title: 'Secondary',
    caption: 'Supporting brand color for secondary actions and decorative surfaces.',
  },
  tertiary: {
    title: 'Tertiary',
    caption: 'Accent hue for highlights, chips, and illustrative moments.',
  },
  error: {
    title: 'Error',
    caption: 'Destructive and error feedback — do not use for incidental UI.',
  },
  neutral: {
    title: 'Neutral',
    caption: 'Greyscale foundation for text, borders, and calm surfaces.',
  },
};

function formatRampTitle(ramp: string): string {
  return ramp
    .split('/')
    .map(function (s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join(' / ');
}

async function buildColorRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as ColorRampRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const variableMap = deps.variableMap;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'SWATCH': {
        cell.counterAxisAlignItems = 'CENTER';
        const rect = figma.createRectangle();
        rect.name = 'swatch';
        rect.resize(48, 48);
        rect.cornerRadius = 10;
        rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
        rect.strokeWeight = 1;
        const borderVar = variables['color/border/subtle'];
        if (borderVar !== null && borderVar !== undefined) {
          bindStrokeToVar(rect, borderVar);
        }
        const swatchVar = variableMap[data.tokenPath];
        if (swatchVar !== undefined) {
          bindPaintToVar(rect, swatchVar);
        } else {
          rect.fills = [{ type: 'SOLID', color: hexToRgb(data.resolvedHex) }];
        }
        cell.appendChild(rect);
        break;
      }
      case 'HEX': {
        const t = await makeTableText(
          data.resolvedHex || '—',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const platformKey = col.id;
        const t = await makeTableText(
          data.codeSyntax[platformKey] || '—',
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

async function buildSpaceRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as PrimitiveFloatRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'VALUE': {
        const t = await makeTableText(
          String(data.resolvedPx) + 'px',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'PREVIEW': {
        cell.layoutMode = 'HORIZONTAL';
        cell.primaryAxisSizingMode = 'FIXED';
        cell.counterAxisSizingMode = 'AUTO';
        cell.counterAxisAlignItems = 'CENTER';
        const bar = figma.createRectangle();
        bar.name = 'preview-bar';
        const barWidth = Math.min(data.resolvedPx || 4, col.width - 40);
        bar.resize(Math.max(barWidth, 2), 16);
        bar.cornerRadius = 4;
        const fillVar = variables['color/primary/200'];
        if (fillVar !== null && fillVar !== undefined) {
          bindPaintToVar(bar, fillVar);
        } else {
          bar.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.88, b: 1 } }];
        }
        cell.appendChild(bar);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const platformKey = col.id;
        const t = await makeTableText(
          data.codeSyntax[platformKey] || '—',
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

async function buildRadiusRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as PrimitiveFloatRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'VALUE': {
        const val = data.resolvedPx === 9999 ? '∞' : String(data.resolvedPx) + 'px';
        const t = await makeTableText(val, col.width, docStyles.Code, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'PREVIEW': {
        cell.layoutMode = 'HORIZONTAL';
        cell.primaryAxisSizingMode = 'FIXED';
        cell.counterAxisSizingMode = 'AUTO';
        cell.counterAxisAlignItems = 'CENTER';
        const sq = figma.createRectangle();
        sq.name = 'preview-square';
        sq.resize(64, 64);
        sq.cornerRadius = Math.min(data.resolvedPx || 0, 32);
        sq.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
        sq.strokeWeight = 1;
        const borderVar = variables['color/border/subtle'];
        if (borderVar !== null && borderVar !== undefined) {
          bindStrokeToVar(sq, borderVar);
        }
        const fillVar = variables['color/neutral/100'];
        if (fillVar !== null && fillVar !== undefined) {
          bindPaintToVar(sq, fillVar);
        } else {
          sq.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 } }];
        }
        cell.appendChild(sq);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const platformKey = col.id;
        const t = await makeTableText(
          data.codeSyntax[platformKey] || '—',
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

async function buildMonoRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as PrimitiveFloatRow;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    let text = '—';
    switch (col.id) {
      case 'TOKEN':
        text = data.tokenPath;
        break;
      case 'VALUE':
        text = data.resolvedValue !== undefined ? String(data.resolvedValue) : '—';
        break;
      case 'WEB':
        text = data.codeSyntax.WEB || '—';
        break;
      case 'ANDROID':
        text = data.codeSyntax.ANDROID || '—';
        break;
      case 'iOS':
        text = data.codeSyntax.iOS || '—';
        break;
      default:
        break;
    }
    const styleId = col.id === 'TOKEN' ? docStyles.TokenName : docStyles.Code;
    const t = await makeTableText(text, col.width, styleId, contentVar);
    cell.appendChild(t);
    rehugCell(cell);
    row.appendChild(cell);
    cell.fills = [];
  }
}

async function buildTypefaceRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as PrimitiveStringRow;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'SPECIMEN': {
        const specimenT = figma.createText();
        specimenT.characters = 'The quick brown fox 01234';
        const family = data.resolvedValue !== '' ? data.resolvedValue : 'Inter';
        try {
          await figma.loadFontAsync({ family: family, style: 'Regular' });
          specimenT.fontName = { family: family, style: 'Regular' };
        } catch {
          /* font may be unavailable on scratch files */
        }
        specimenT.fontSize = 22;
        specimenT.resize(col.width - 40, 1);
        specimenT.textAutoResize = 'HEIGHT';
        if (contentVar !== null) {
          bindPaintToVar(specimenT, contentVar);
        }
        cell.appendChild(specimenT);
        break;
      }
      case 'VALUE': {
        const t = await makeTableText(
          data.resolvedValue || '—',
          col.width,
          docStyles.Code,
          contentVar,
        );
        cell.appendChild(t);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const platformKey = col.id;
        const t = await makeTableText(
          data.codeSyntax[platformKey] || '—',
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

function countColorSwatches(ramps: Record<string, ColorRampRow[]>): number {
  let count = 0;
  const keys = Object.keys(ramps);
  for (let ki = 0; ki < keys.length; ki++) {
    count += ramps[keys[ki]].length;
  }
  return count;
}

/** Step 15a — Primitives page orchestrator (color ramps + optional non-color tables). */
export async function buildPrimitivesPage(
  tokens: TokensV1,
  target: CanvasPageTarget,
): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  await loadFontsForCanvas();
  const variableMap = await ensureLocalVariableMap();
  const chromeVars = await resolveChromeVariables(CHROME_PATHS, variableMap);
  const docStyles = await resolveDocStyles();

  const page = findStyleGuidePage('primitives', target.pageId);
  await figma.setCurrentPageAsync(page);
  const content = buildPageContent(page);
  suspendPageContentAutoLayout(content);

  const colorRamps = projectColorRampsFromTokens(tokens);
  const floatRows = projectPrimitiveFloatRows(tokens);
  const typefaceRows = projectPrimitiveStringRows(tokens);

  let tableCount = 0;

  const rampKeys = Object.keys(colorRamps);
  for (let ri = 0; ri < rampKeys.length; ri++) {
    const ramp = rampKeys[ri];
    const rampRows = colorRamps[ramp];
    if (rampRows.length === 0) {
      continue;
    }
    const meta = RAMP_DEFAULTS[ramp];
    const title = meta !== undefined ? meta.title : formatRampTitle(ramp);
    const caption = meta !== undefined ? meta.caption : formatRampTitle(ramp) + ' ramp.';
    await buildTable(
      {
        slug: 'primitives/color/' + ramp,
        tableKey: 'primitives/color-ramp',
        title: title,
        caption: caption,
        rows: rampRows,
        buildRow: buildColorRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  if (floatRows.space.length > 0) {
    await buildTable(
      {
        slug: 'primitives/space',
        tableKey: 'primitives/space',
        title: 'Space',
        caption: 'Spacing scale on a 4px base grid.',
        rows: floatRows.space,
        buildRow: buildSpaceRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  if (floatRows.radius.length > 0) {
    await buildTable(
      {
        slug: 'primitives/radius',
        tableKey: 'primitives/radius',
        title: 'Corner Radius',
        caption: 'Corner rounding primitives from square through pill.',
        rows: floatRows.radius,
        buildRow: buildRadiusRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  if (floatRows.elevation.length > 0) {
    await buildTable(
      {
        slug: 'primitives/elevation',
        tableKey: 'primitives/elevation',
        title: 'Elevation',
        caption: 'Raw blur steps consumed by shadow/*/blur aliases in Effects.',
        rows: floatRows.elevation,
        buildRow: buildMonoRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  if (typefaceRows.length > 0) {
    await buildTable(
      {
        slug: 'primitives/typeface',
        tableKey: 'primitives/typeface',
        title: 'Typeface',
        caption: 'Font family primitives. Display for headings, Body for paragraph text.',
        rows: typefaceRows,
        buildRow: buildTypefaceRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  if (floatRows.fontWeight.length > 0) {
    await buildTable(
      {
        slug: 'primitives/font-weight',
        tableKey: 'primitives/font-weight',
        title: 'Font weight',
        caption: 'Shared emphasis weight (Typography Body/*/emphasis aliases this Primitive).',
        rows: floatRows.fontWeight,
        buildRow: buildMonoRow,
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
  const swatchCount = countColorSwatches(colorRamps);
  pluginLog('[canvas] buildPrimitivesPage done', String(durationMs) + 'ms', {
    tableCount: tableCount,
    swatchCount: swatchCount,
  });

  return {
    ok: true,
    builder: 'primitives',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: tableCount,
    swatchCount: swatchCount,
    warnings: warnings,
  };
}
