import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';
import { resolveDocStyles } from '@/core/canvas/lib/cells';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import { comboToSetProperties } from '@/core/components/scaffold/curateVariantCombos';
import { specNameToDocKey } from '@/core/components/scaffold/componentPageRouting';
import type { VariantCombo } from '@/core/components/scaffold/types';
import {
  createDocSectionFrame,
  reassertDocSectionStretch,
} from '@/core/components/scaffold/usageFrame';
import { formatVariantName, sortAxisKeys } from '@/core/components/scaffold/variantMatrix';

import { applyButtonStateOverride, type ButtonStateKey } from './applyStateOverride';
import {
  DASH_PATTERN,
  DOC_FRAME_WIDTH,
  GUTTER_W_SIZE,
  GUTTER_W_VARIANT,
  MATRIX_CORNER_RADIUS,
} from './constants';
import {
  appendDocAutoHeightText,
  applyDocStrokeSides,
  bindDocFrameFill,
  reassertDocHugFrame,
  resolveDocPipelineChrome,
} from './docChrome';

const SECTION_TITLE = 'Variants × States';

const MATRIX_STATES: ReadonlyArray<{ key: ButtonStateKey; group: 'default' | 'disabled' }> = [
  { key: 'default', group: 'default' },
  { key: 'hover', group: 'default' },
  { key: 'pressed', group: 'default' },
  { key: 'disabled', group: 'disabled' },
];

function docMatrixGroupName(docKey: string): string {
  return `doc/component/${docKey}/matrix-group`;
}

function docMatrixRootName(docKey: string): string {
  return `doc/component/${docKey}/matrix`;
}

function createFixedFrame(
  name: string,
  layoutMode: 'HORIZONTAL' | 'VERTICAL',
  width: number,
  height: number,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode;
  frame.fills = [];
  resizeThenApplySizing(frame, width, height, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
  });
  return frame;
}

function createStretchFrame(name: string, layoutMode: 'HORIZONTAL' | 'VERTICAL'): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode;
  frame.fills = [];
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.layoutAlign = 'STRETCH';
  return frame;
}

function prettyVariantLabel(variant: string): string {
  if (variant.length === 0) {
    return variant;
  }
  return variant.charAt(0).toUpperCase() + variant.slice(1);
}

function variantLookupKey(variant: string, size: string): string {
  return formatVariantName({ variant, size });
}

/**
 * Section 4 — Variants × States matrix specimen. Lifted from `cc-doc-matrix-only.js` lines 1-148.
 */
export async function buildMatrix(
  docRoot: FrameNode,
  spec: ComponentSpecV1,
  _componentSet: ComponentSetNode,
  variantByKey: Record<string, ComponentNode>,
): Promise<FrameNode> {
  const docKey = specNameToDocKey(spec.name);
  const variants = spec.variantMatrix.variant as string[];
  const sizes = spec.variantMatrix.size as string[];
  const gutterSizeW = GUTTER_W_SIZE;
  const gutterVariantW = GUTTER_W_VARIANT;
  const gutter = gutterSizeW + gutterVariantW;
  const cellW = Math.floor((DOC_FRAME_WIDTH - gutter) / MATRIX_STATES.length);
  const defaultStates = MATRIX_STATES.filter((state) => state.group === 'default');
  const disabledStates = MATRIX_STATES.filter((state) => state.group === 'disabled');
  const matrixAxes = sortAxisKeys(spec.variantMatrix);

  const variableMap = await ensureLocalVariableMap();
  const [docStyles, chrome] = await Promise.all([
    resolveDocStyles(),
    resolveDocPipelineChrome(variableMap),
  ]);

  const group = createDocSectionFrame(docMatrixGroupName(docKey), 'VERTICAL');
  group.resize(DOC_FRAME_WIDTH, 1);
  group.itemSpacing = 12;
  bindDocFrameFill(group, chrome.bgDefault);
  docRoot.appendChild(group);
  reassertDocSectionStretch(group);

  await appendDocAutoHeightText(group, {
    name: 'title',
    characters: SECTION_TITLE,
    styleId: docStyles.Section,
    width: DOC_FRAME_WIDTH,
    fillVar: chrome.contentVar,
  });
  reassertDocSectionStretch(group);

  const matrix = createDocSectionFrame(docMatrixRootName(docKey), 'VERTICAL');
  matrix.resize(DOC_FRAME_WIDTH, 1);
  matrix.cornerRadius = MATRIX_CORNER_RADIUS;
  matrix.dashPattern = [...DASH_PATTERN];
  matrix.fills = [];
  applyDocStrokeSides(matrix, chrome.borderVar, { top: 1, right: 1, bottom: 1, left: 1 });
  group.appendChild(matrix);
  reassertDocSectionStretch(matrix);

  if (disabledStates.length > 0) {
    const hg = createFixedFrame('matrix/header-groups', 'HORIZONTAL', DOC_FRAME_WIDTH, 44);
    hg.counterAxisAlignItems = 'CENTER';
    applyDocStrokeSides(hg, chrome.borderVar, { bottom: 1 });
    matrix.appendChild(hg);

    hg.appendChild(createFixedFrame('gutter', 'HORIZONTAL', gutter, 44));

    const defaultGroupCell = createFixedFrame(
      'cell/default-group',
      'HORIZONTAL',
      cellW * defaultStates.length,
      44,
    );
    defaultGroupCell.primaryAxisAlignItems = 'CENTER';
    defaultGroupCell.counterAxisAlignItems = 'CENTER';
    hg.appendChild(defaultGroupCell);
    await appendDocAutoHeightText(defaultGroupCell, {
      characters: 'DEFAULT',
      styleId: docStyles.Caption,
      width: cellW * defaultStates.length,
      fillVar: chrome.mutedVar,
      fillFallback: 'mutedText',
      textAlign: 'CENTER',
    });

    const disabledGroupCell = createFixedFrame(
      'cell/disabled-group',
      'HORIZONTAL',
      cellW * disabledStates.length,
      44,
    );
    disabledGroupCell.primaryAxisAlignItems = 'CENTER';
    disabledGroupCell.counterAxisAlignItems = 'CENTER';
    hg.appendChild(disabledGroupCell);
    await appendDocAutoHeightText(disabledGroupCell, {
      characters: 'DISABLED',
      styleId: docStyles.Caption,
      width: cellW * disabledStates.length,
      fillVar: chrome.mutedVar,
      fillFallback: 'mutedText',
      textAlign: 'CENTER',
    });
  }

  const hs = createFixedFrame('matrix/header-states', 'HORIZONTAL', DOC_FRAME_WIDTH, 40);
  hs.counterAxisAlignItems = 'CENTER';
  applyDocStrokeSides(hs, chrome.borderVar, { bottom: 1 });
  matrix.appendChild(hs);

  hs.appendChild(createFixedFrame('gutter', 'HORIZONTAL', gutter, 40));

  for (let i = 0; i < MATRIX_STATES.length; i++) {
    const state = MATRIX_STATES[i];
    const stateCell = createFixedFrame(`cell/${state.key}`, 'HORIZONTAL', cellW, 40);
    stateCell.primaryAxisAlignItems = 'CENTER';
    stateCell.counterAxisAlignItems = 'CENTER';
    hs.appendChild(stateCell);
    await appendDocAutoHeightText(stateCell, {
      characters: state.key,
      styleId: docStyles.Caption,
      width: cellW,
      fillVar: chrome.mutedVar,
      fillFallback: 'mutedText',
      textAlign: 'CENTER',
    });
  }

  for (let si = 0; si < sizes.length; si++) {
    const size = sizes[si];
    const sg = createStretchFrame(`matrix/size-group/${size}`, 'HORIZONTAL');
    matrix.appendChild(sg);

    const sizeLabel = createFixedFrame(`size-label/${size}`, 'VERTICAL', gutterSizeW, 1);
    sizeLabel.primaryAxisSizingMode = 'AUTO';
    sizeLabel.counterAxisSizingMode = 'FIXED';
    sizeLabel.primaryAxisAlignItems = 'CENTER';
    sizeLabel.counterAxisAlignItems = 'CENTER';
    applyDocStrokeSides(sizeLabel, chrome.borderVar, { right: 1 });
    sg.appendChild(sizeLabel);
    await appendDocAutoHeightText(sizeLabel, {
      characters: size,
      styleId: docStyles.TokenName,
      width: gutterSizeW,
      fillVar: chrome.contentVar,
      textAlign: 'CENTER',
      layoutSizingHorizontal: 'FILL',
    });
    reassertDocHugFrame(sizeLabel);

    const rowsStack = createStretchFrame('variant-rows', 'VERTICAL');
    sg.appendChild(rowsStack);

    for (let vi = 0; vi < variants.length; vi++) {
      const variant = variants[vi];
      const isLastVariantRow = si === sizes.length - 1 && vi === variants.length - 1;
      const row = createStretchFrame(`row/${variant}`, 'HORIZONTAL');
      row.minHeight = 72;
      row.counterAxisAlignItems = 'CENTER';
      if (!isLastVariantRow) {
        applyDocStrokeSides(row, chrome.borderVar, { bottom: 1 });
      }
      rowsStack.appendChild(row);

      const variantLabel = createFixedFrame(`row/${variant}/label`, 'VERTICAL', gutterVariantW, 1);
      variantLabel.primaryAxisSizingMode = 'AUTO';
      variantLabel.counterAxisSizingMode = 'FIXED';
      variantLabel.minHeight = 72;
      variantLabel.paddingLeft = 20;
      variantLabel.paddingRight = 20;
      variantLabel.primaryAxisAlignItems = 'CENTER';
      variantLabel.counterAxisAlignItems = 'MIN';
      variantLabel.layoutAlign = 'STRETCH';
      row.appendChild(variantLabel);
      await appendDocAutoHeightText(variantLabel, {
        characters: prettyVariantLabel(variant),
        styleId: docStyles.Caption,
        width: gutterVariantW - 40,
        fillVar: chrome.mutedVar,
        fillFallback: 'mutedText',
      });
      reassertDocHugFrame(variantLabel);

      for (let sti = 0; sti < MATRIX_STATES.length; sti++) {
        const state = MATRIX_STATES[sti];
        const cell = figma.createFrame();
        cell.name = `cell/${variant}/${state.key}`;
        cell.fills = [];
        cell.layoutMode = 'HORIZONTAL';
        resizeThenApplySizing(cell, cellW, 72, {
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'AUTO',
        });
        cell.minHeight = 72;
        cell.paddingLeft = 16;
        cell.paddingRight = 16;
        cell.paddingTop = 16;
        cell.paddingBottom = 16;
        cell.primaryAxisAlignItems = 'CENTER';
        cell.counterAxisAlignItems = 'CENTER';
        row.appendChild(cell);

        const lookupKey = variantLookupKey(variant, size);
        const componentNode = variantByKey[lookupKey];
        if (componentNode !== undefined) {
          const instance = componentNode.createInstance();
          const combo: VariantCombo = { variant, size };
          const props = comboToSetProperties(combo, matrixAxes);
          if (typeof instance.setProperties === 'function' && Object.keys(props).length > 0) {
            try {
              instance.setProperties(props);
            } catch {
              /* instance still uses variant master */
            }
          }
          applyButtonStateOverride(instance, state.key);
          cell.appendChild(instance);
        }
      }
    }
  }

  reassertDocSectionStretch(matrix);
  reassertDocHugFrame(matrix);
  reassertDocSectionStretch(group);

  return group;
}
