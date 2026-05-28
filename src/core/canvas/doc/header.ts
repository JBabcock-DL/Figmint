import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';
import { resolveDocStyles } from '@/core/canvas/lib/cells';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import {
  docHeaderSectionName,
  specNameToDocKey,
} from '@/core/components/scaffold/componentPageRouting';
import {
  createDocSectionFrame,
  reassertDocSectionStretch,
} from '@/core/components/scaffold/usageFrame';

import { appendDocAutoHeightText, reassertDocHugFrame, resolveDocPipelineChrome } from './docChrome';

type DocHeaderSpecFields = {
  displayTitle?: string;
  summary?: string;
};

/**
 * Section 1 — doc page header (title + summary). Lifted from `cc-doc-page-header.js` §6.4.
 */
export async function buildSectionHeader(
  docRoot: FrameNode,
  spec: ComponentSpecV1,
): Promise<FrameNode> {
  const docKey = specNameToDocKey(spec.name);
  const header = createDocSectionFrame(docHeaderSectionName(docKey), 'VERTICAL');
  header.resize(DOC_FRAME_WIDTH, 1);
  header.itemSpacing = 12;
  header.fills = [];
  docRoot.appendChild(header);
  reassertDocSectionStretch(header);

  const docFields = spec as ComponentSpecV1 & DocHeaderSpecFields;
  const titleText = docFields.displayTitle ?? spec.name;
  const summaryText = docFields.summary ?? '';

  const variableMap = await ensureLocalVariableMap();
  const [docStyles, chrome] = await Promise.all([
    resolveDocStyles(),
    resolveDocPipelineChrome(variableMap),
  ]);

  await appendDocAutoHeightText(header, {
    name: 'title',
    characters: titleText,
    styleId: docStyles.Section,
    width: DOC_FRAME_WIDTH,
    fillVar: chrome.contentVar,
  });

  await appendDocAutoHeightText(header, {
    name: 'summary',
    characters: summaryText,
    styleId: docStyles.Caption,
    width: DOC_FRAME_WIDTH,
    fillVar: chrome.mutedVar,
    fillFallback: 'mutedText',
  });

  reassertDocHugFrame(header);
  reassertDocSectionStretch(header);
  return header;
}
