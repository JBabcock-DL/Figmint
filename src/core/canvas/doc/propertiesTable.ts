import type { ComponentSpecProp, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_MIN_HEIGHT,
  TABLE_WIDTH,
} from '@/core/canvas/constants';
import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';
import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import {
  createBodyCell,
  createBodyRow,
  createHeaderCell,
  reassertBodyCell,
  reassertBodyRow,
} from '@/core/canvas/helpers/tableCells';
import { createTableGroup, createTableRoot } from '@/core/canvas/helpers/tableShell';
import { makeTableText, resolveDocStyles, type DocStyleIds } from '@/core/canvas/lib/cells';
import { hexToRgb } from '@/core/canvas/lib/colorFormats';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import { specNameToDocKey } from '@/core/components/scaffold/componentPageRouting';

import { resolveDocPipelineChrome } from './docChrome';

const FALLBACK_TABLE_BORDER_HEX = '#edecee';
const FALLBACK_TABLE_HEADER_SURFACE_HEX = '#edecee';
const FALLBACK_TABLE_SURFACE_HEX = '#f7f7f8';

const PROPERTIES_TABLE_SLUG_SUFFIX = '/properties';

/** §4 column layout — sums to 1640. */
export const PROPERTIES_TABLE_COLUMNS = [
  { id: 'property', header: 'PROPERTY', width: 240, bodyStyle: 'TokenName' as const },
  { id: 'type', header: 'TYPE', width: 380, bodyStyle: 'Code' as const },
  { id: 'default', header: 'DEFAULT', width: 160, bodyStyle: 'Code' as const },
  { id: 'required', header: 'REQUIRED', width: 120, bodyStyle: 'Caption' as const },
  { id: 'description', header: 'DESCRIPTION', width: 740, bodyStyle: 'Caption' as const },
] as const;

const STATE_PROP_NAMES = ['disabled', 'checked', 'selected', 'pressed', 'open'] as const;
const CONTENT_PROP_NAMES = ['children', 'label', 'placeholder'] as const;
const A11Y_PROP_NAMES = ['aria-label', 'role'] as const;
const ESCAPE_PROP_NAMES = ['asChild', 'type', 'className', 'ref', 'key', 'style'] as const;

/** Props omitted from the doc properties table (§13 Button reference has no `loading` row). */
const DOC_TABLE_EXCLUDED = new Set(['loading']);

const PROP_DESCRIPTIONS: Record<string, string> = {
  variant: 'Visual style.',
  size: 'Overall height + padding preset.',
  disabled: 'Disables pointer + keyboard interaction; visual dim applied.',
  asChild: 'Renders the styled classes onto the immediate child via Radix Slot.',
  type: 'Native HTML type.',
  className: 'Tailwind class escape hatch.',
};

function applyRowBorder(row: FrameNode, borderVar: Variable | null): void {
  row.strokes = [{ type: 'SOLID', color: hexToRgb(FALLBACK_TABLE_BORDER_HEX) }];
  row.strokeWeight = 1;
  row.strokeBottomWeight = 1;
  row.strokeTopWeight = 0;
  row.strokeLeftWeight = 0;
  row.strokeRightWeight = 0;
  if (borderVar !== null) {
    bindStrokeToVar(row, borderVar);
  }
}

function formatPropType(prop: ComponentSpecProp): string {
  if (prop.type === 'enum' && prop.enum !== undefined && prop.enum.length > 0) {
    return prop.enum.map((v) => `"${String(v)}"`).join(' | ');
  }
  return prop.type;
}

function formatPropDefault(prop: ComponentSpecProp): string {
  const value = prop.default;
  if (value === undefined || value === '') {
    return '—';
  }
  if (prop.type === 'enum' || prop.type === 'string') {
    return `"${String(value)}"`;
  }
  return String(value);
}

function propDescription(prop: ComponentSpecProp): string {
  return PROP_DESCRIPTIONS[prop.name] ?? '';
}

/** §4 property row ordering: variant axes → state → content → a11y → escape-hatch. */
export function orderPropsForDocTable(spec: ComponentSpecV1): ComponentSpecProp[] {
  const byName = new Map<string, ComponentSpecProp>();
  for (let i = 0; i < spec.props.length; i++) {
    byName.set(spec.props[i].name, spec.props[i]);
  }

  const ordered: ComponentSpecProp[] = [];
  const used = new Set<string>();

  const pushName = (name: string): void => {
    if (DOC_TABLE_EXCLUDED.has(name) || used.has(name)) {
      return;
    }
    const prop = byName.get(name);
    if (prop !== undefined) {
      ordered.push(prop);
      used.add(name);
    }
  };

  const matrixKeys = Object.keys(spec.variantMatrix);
  for (let k = 0; k < matrixKeys.length; k++) {
    pushName(matrixKeys[k]);
  }
  for (let s = 0; s < STATE_PROP_NAMES.length; s++) {
    pushName(STATE_PROP_NAMES[s]);
  }
  for (let c = 0; c < CONTENT_PROP_NAMES.length; c++) {
    pushName(CONTENT_PROP_NAMES[c]);
  }
  for (let a = 0; a < A11Y_PROP_NAMES.length; a++) {
    pushName(A11Y_PROP_NAMES[a]);
  }
  for (let e = 0; e < ESCAPE_PROP_NAMES.length; e++) {
    pushName(ESCAPE_PROP_NAMES[e]);
  }

  for (let i = 0; i < spec.props.length; i++) {
    const prop = spec.props[i];
    if (!used.has(prop.name) && !DOC_TABLE_EXCLUDED.has(prop.name)) {
      ordered.push(prop);
      used.add(prop.name);
    }
  }

  return ordered;
}

function propRowValues(prop: ComponentSpecProp): [string, string, string, string, string] {
  return [
    prop.name,
    formatPropType(prop),
    formatPropDefault(prop),
    'no',
    propDescription(prop),
  ];
}

function styleIdForColumn(
  docStyles: DocStyleIds,
  styleKey: (typeof PROPERTIES_TABLE_COLUMNS)[number]['bodyStyle'],
): string | null {
  return docStyles[styleKey];
}

async function appendPropertiesHeaderRow(
  table: FrameNode,
  docStyles: DocStyleIds,
  headerSurfaceVar: Variable | null,
  borderVar: Variable | null,
  mutedVar: Variable | null,
): Promise<FrameNode> {
  const header = figma.createFrame();
  header.name = 'header';
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.resize(TABLE_WIDTH, TABLE_HEADER_HEIGHT);
  header.counterAxisAlignItems = 'CENTER';
  header.fills = [];
  if (headerSurfaceVar !== null) {
    bindPaintToVar(header, headerSurfaceVar);
  } else {
    header.fills = [{ type: 'SOLID', color: hexToRgb(FALLBACK_TABLE_HEADER_SURFACE_HEX) }];
  }
  applyRowBorder(header, borderVar);

  for (let c = 0; c < PROPERTIES_TABLE_COLUMNS.length; c++) {
    const col = PROPERTIES_TABLE_COLUMNS[c];
    const cell = createHeaderCell(
      col.width,
      col.header,
      col.id,
      mutedVar,
      docStyles.Caption,
    );
    header.appendChild(cell);
  }

  table.appendChild(header);
  return header;
}

async function appendPropertiesBodyRow(
  table: FrameNode,
  prop: ComponentSpecProp,
  isLast: boolean,
  docStyles: DocStyleIds,
  borderVar: Variable | null,
  contentVar: Variable | null,
  mutedVar: Variable | null,
): Promise<void> {
  const values = propRowValues(prop);
  const row = createBodyRow(`prop/${prop.name}`, isLast ? null : borderVar);
  if (!isLast && borderVar === null) {
    applyRowBorder(row, null);
  }

  for (let j = 0; j < PROPERTIES_TABLE_COLUMNS.length; j++) {
    const col = PROPERTIES_TABLE_COLUMNS[j];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    const styleId = styleIdForColumn(docStyles, col.bodyStyle);
    const fillVar =
      col.bodyStyle === 'Caption'
        ? mutedVar
        : contentVar;
    const text = await makeTableText(values[j], col.width, styleId, fillVar);
    cell.appendChild(text);
    reassertBodyCell(cell);
    row.appendChild(cell);
  }

  reassertBodyRow(row);
  table.appendChild(row);
}

/**
 * Section 2 — properties + types table. Lifted from `cc-doc-chunk-b.js` §6.6 + `cc-doc-fill-props.js`.
 */
export async function buildPropertiesTable(
  docRoot: FrameNode,
  spec: ComponentSpecV1,
): Promise<FrameNode> {
  const docKey = specNameToDocKey(spec.name);
  const tableSlug = docKey + PROPERTIES_TABLE_SLUG_SUFFIX;

  const [docStyles, chrome] = await Promise.all([
    resolveDocStyles(),
    ensureLocalVariableMap().then(resolveDocPipelineChrome),
  ]);
  await loadFontsForCanvas();

  const group = createTableGroup(tableSlug);
  group.resizeWithoutConstraints(DOC_FRAME_WIDTH, 1);
  group.layoutSizingVertical = 'HUG';

  const table = createTableRoot(tableSlug);
  if (chrome.borderVar !== null) {
    table.strokes = [{ type: 'SOLID', color: hexToRgb(FALLBACK_TABLE_BORDER_HEX) }];
    table.strokeWeight = 1;
    bindStrokeToVar(table, chrome.borderVar);
  } else {
    table.strokes = [];
  }
  if (chrome.bgDefault !== null) {
    bindPaintToVar(table, chrome.bgDefault);
  } else {
    table.fills = [{ type: 'SOLID', color: hexToRgb(FALLBACK_TABLE_SURFACE_HEX) }];
  }
  table.clipsContent = true;

  await appendPropertiesHeaderRow(
    table,
    docStyles,
    chrome.bgVariant,
    chrome.borderVar,
    chrome.mutedVar,
  );

  const rows = orderPropsForDocTable(spec);
  for (let i = 0; i < rows.length; i++) {
    await appendPropertiesBodyRow(
      table,
      rows[i],
      i === rows.length - 1,
      docStyles,
      chrome.borderVar,
      chrome.contentVar,
      chrome.mutedVar,
    );
  }

  group.appendChild(table);
  docRoot.appendChild(group);
  group.primaryAxisSizingMode = 'AUTO';
  group.layoutSizingVertical = 'HUG';

  return group;
}
