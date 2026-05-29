import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { DASH_PATTERN, DOC_FRAME_WIDTH, MATRIX_CORNER_RADIUS } from '@/core/canvas/doc/constants';
import { resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';
import { resolveDocStyles } from '@/core/canvas/lib/cells';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import { reassertDocSectionStretch } from '@/core/components/scaffold/usageFrame';

import {
  applyDocStrokeSides,
  applyDocAutoHeightLayout,
  bindDocFrameFill,
  createDocAutoHeightText,
  reassertDocHugFrame,
  resolveDocPipelineChrome,
} from './docChrome';

const SECTION_TITLE = 'Component';
const SECTION_CAPTION = 'Live ComponentSet — edit here, matrix updates.';

const TITLE_NODE_NAME = 'title';
const CAPTION_NODE_NAME = 'caption';

function removeSectionTextNodes(setGroup: FrameNode): void {
  for (let i = setGroup.children.length - 1; i >= 0; i--) {
    const child = setGroup.children[i];
    if (
      child.type === 'TEXT' &&
      (child.name === TITLE_NODE_NAME || child.name === CAPTION_NODE_NAME)
    ) {
      child.remove();
    }
  }
}

function applyComponentSetChrome(
  componentSet: ComponentSetNode,
  chrome: Awaited<ReturnType<typeof resolveDocPipelineChrome>>,
): void {
  componentSet.layoutMode = 'HORIZONTAL';
  componentSet.layoutWrap = 'WRAP';
  resizeThenApplySizing(componentSet as unknown as FrameNode, DOC_FRAME_WIDTH, 1, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'AUTO',
  });
  componentSet.paddingLeft = 32;
  componentSet.paddingRight = 32;
  componentSet.paddingTop = 32;
  componentSet.paddingBottom = 32;
  componentSet.itemSpacing = 24;
  componentSet.counterAxisSpacing = 24;
  componentSet.cornerRadius = MATRIX_CORNER_RADIUS;
  componentSet.dashPattern = [...DASH_PATTERN];
  componentSet.strokeWeight = 1;

  bindDocFrameFill(componentSet, chrome.bgDefault);
  applyDocStrokeSides(componentSet, chrome.borderVar, { top: 1, right: 1, bottom: 1, left: 1 });
}

/**
 * Section 3 — extends `ensureComponentSetGroup` with title/caption + ComponentSet WRAP grid chrome.
 * Lifted from `04-doc-pipeline-contract.md` §3.2.
 */
export async function extendComponentSetGroup(
  setGroup: FrameNode,
  componentSet: ComponentSetNode,
  _spec: ComponentSpecV1,
): Promise<void> {
  removeSectionTextNodes(setGroup);

  const variableMap = await ensureLocalVariableMap();
  const [docStyles, chrome] = await Promise.all([
    resolveDocStyles(),
    resolveDocPipelineChrome(variableMap),
  ]);

  const title = await createDocAutoHeightText({
    name: TITLE_NODE_NAME,
    characters: SECTION_TITLE,
    styleId: docStyles.Section,
    width: DOC_FRAME_WIDTH,
    fillVar: chrome.contentVar,
  });
  setGroup.insertChild(0, title);
  applyDocAutoHeightLayout(title);

  const caption = await createDocAutoHeightText({
    name: CAPTION_NODE_NAME,
    characters: SECTION_CAPTION,
    styleId: docStyles.Caption,
    width: DOC_FRAME_WIDTH,
    fillVar: chrome.mutedVar,
    fillFallback: 'mutedText',
  });
  setGroup.insertChild(1, caption);
  applyDocAutoHeightLayout(caption);

  applyComponentSetChrome(componentSet, chrome);
  reassertDocHugFrame(setGroup);
  reassertDocSectionStretch(setGroup);
}
