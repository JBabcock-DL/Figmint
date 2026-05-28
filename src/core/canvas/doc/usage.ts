import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { createHugFrame } from '@/core/canvas/helpers/autoLayout';
import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';
import { resolveDocStyles } from '@/core/canvas/lib/cells';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import {
  docUsageSectionName,
  specNameToDocKey,
} from '@/core/components/scaffold/componentPageRouting';
import {
  createDocSectionFrame,
  reassertDocSectionStretch,
} from '@/core/components/scaffold/usageFrame';

import {
  appendDocAutoHeightText,
  bindDocFrameFill,
  reassertDocHugFrame,
  resolveDocPipelineChrome,
} from './docChrome';

const CARD_WIDTH = 805;
const CARD_PADDING = 28;
const CARD_INNER_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const CARD_ITEM_SPACING = 16;
const BULLETS_ITEM_SPACING = 12;
const USAGE_ROW_ITEM_SPACING = 30;

const TODO_PLACEHOLDER = 'TODO';

type UsageSpecFields = {
  usage?: {
    do?: string[];
    dont?: string[];
  };
};

function normalizeBullets(raw: string[] | undefined): string[] {
  const bullets = raw !== undefined ? raw.slice() : [];
  while (bullets.length < 3) {
    bullets.push(TODO_PLACEHOLDER);
  }
  return bullets;
}

function usageCardFrameName(titleText: string): string {
  return 'usage/' + titleText.toLowerCase().replace(/[^a-z]/g, '');
}

async function buildUsageCard(
  titleText: string,
  glyph: string,
  bullets: string[],
  docStyles: Awaited<ReturnType<typeof resolveDocStyles>>,
  chrome: Awaited<ReturnType<typeof resolveDocPipelineChrome>>,
): Promise<FrameNode> {
  const card = createHugFrame({
    name: usageCardFrameName(titleText),
    layoutMode: 'VERTICAL',
    width: CARD_WIDTH,
    height: 1,
  });
  card.paddingLeft = CARD_PADDING;
  card.paddingRight = CARD_PADDING;
  card.paddingTop = CARD_PADDING;
  card.paddingBottom = CARD_PADDING;
  card.itemSpacing = CARD_ITEM_SPACING;
  card.cornerRadius = 16;
  bindDocFrameFill(card, chrome.bgDefault);

  await appendDocAutoHeightText(card, {
    name: 'title',
    characters: `${glyph} ${titleText}`,
    styleId: docStyles.TokenName,
    width: CARD_INNER_WIDTH,
    fillVar: chrome.contentVar,
  });
  reassertDocHugFrame(card);

  const list = createHugFrame({
    name: 'bullets',
    layoutMode: 'VERTICAL',
    width: CARD_INNER_WIDTH,
    height: 1,
  });
  list.itemSpacing = BULLETS_ITEM_SPACING;
  list.layoutAlign = 'STRETCH';
  list.fills = [];
  card.appendChild(list);
  reassertDocHugFrame(list);

  const normalized = normalizeBullets(bullets);
  for (let i = 0; i < normalized.length; i++) {
    await appendDocAutoHeightText(list, {
      name: `bullet-${String(i + 1)}`,
      characters: `· ${normalized[i]}`,
      styleId: docStyles.Caption,
      width: CARD_INNER_WIDTH,
      fillVar: chrome.contentVar,
    });
  }
  reassertDocHugFrame(list);
  reassertDocHugFrame(card);

  return card;
}

/**
 * Section 5 — Do / Don't usage notes. Lifted from `cc-doc-usage-only.js` §6.
 */
export async function buildUsageNotes(
  docRoot: FrameNode,
  spec: ComponentSpecV1,
): Promise<FrameNode> {
  const docKey = specNameToDocKey(spec.name);
  const usageFields = spec as ComponentSpecV1 & UsageSpecFields;
  const usageDo = usageFields.usage?.do;
  const usageDont = usageFields.usage?.dont;

  const row = createDocSectionFrame(docUsageSectionName(docKey), 'HORIZONTAL');
  row.resize(DOC_FRAME_WIDTH, 1);
  row.itemSpacing = USAGE_ROW_ITEM_SPACING;
  row.fills = [];
  docRoot.appendChild(row);
  reassertDocSectionStretch(row);

  const variableMap = await ensureLocalVariableMap();
  const [docStyles, chrome] = await Promise.all([
    resolveDocStyles(),
    resolveDocPipelineChrome(variableMap),
  ]);

  const doCard = await buildUsageCard('Do', '✓', usageDo ?? [], docStyles, chrome);
  row.appendChild(doCard);
  reassertDocHugFrame(row);

  const dontCard = await buildUsageCard("Don't", '✕', usageDont ?? [], docStyles, chrome);
  row.appendChild(dontCard);
  reassertDocHugFrame(row);
  reassertDocSectionStretch(row);

  return row;
}
