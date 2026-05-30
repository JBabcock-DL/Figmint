import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

import { format } from '@/io/formats';
import { pluginLog } from '@/core/pluginLog';

import { captureSelection } from './capture';
import { enumerateComponents } from './components';
import { mergeComponentUsages, mergeTokenLists } from './merge';
import { enumerateTokensAndLayout } from './tokens';

export const PLUGIN_DATA_MAX_BYTES = 100_000;

export interface BuildHandoffContextResult {
  document: HandoffContextV1;
  markdown: string;
  warnings: string[];
}

export function buildFileUrl(fileKey: string, fileName: string): string {
  if (fileKey === '') {
    return '';
  }
  return 'https://www.figma.com/design/' + fileKey + '/' + encodeURIComponent(fileName);
}

export function estimatePayloadBytes(doc: HandoffContextV1): number {
  return JSON.stringify(doc).length;
}

function firstNonEmptyDeepLink(
  frames: { deepLink: string }[],
): string | undefined {
  for (let i = 0; i < frames.length; i++) {
    const link = frames[i].deepLink;
    if (link !== '') {
      return link;
    }
  }
  return undefined;
}

export async function buildHandoffContext(): Promise<BuildHandoffContextResult> {
  const buildWarnings: string[] = [];
  const capture = await captureSelection();

  const componentLists: Awaited<ReturnType<typeof enumerateComponents>>[] = [];
  const tokenLists: string[][] = [];
  let primaryAutoLayout: Awaited<ReturnType<typeof enumerateTokensAndLayout>>['autoLayout'] = {
    direction: 'vertical',
    gap: '0',
    padding: '0',
  };
  let primaryLayoutSet = false;

  for (let i = 0; i < capture.frames.length; i++) {
    const frame = capture.frames[i];
    const root = await figma.getNodeByIdAsync(frame.nodeId);
    if (root === null || !('type' in root)) {
      buildWarnings.push('Node not found for frame "' + frame.name + '" (' + frame.nodeId + ')');
      continue;
    }

    const sceneRoot = root as SceneNode;
    const components = await enumerateComponents(sceneRoot);
    const tokensAndLayout = await enumerateTokensAndLayout(sceneRoot);

    componentLists.push(components);
    tokenLists.push(tokensAndLayout.tokens);

    if (!primaryLayoutSet) {
      primaryAutoLayout = tokensAndLayout.autoLayout;
      primaryLayoutSet = true;
    }
  }

  const mergedComponents = mergeComponentUsages(componentLists);
  const mergedTokens = mergeTokenLists(tokenLists);

  const fileKey = capture.fileKey;
  const firstDeepLink = firstNonEmptyDeepLink(capture.frames);
  const frameUrl =
    firstDeepLink !== undefined
      ? firstDeepLink
      : buildFileUrl(fileKey, figma.root.name);

  const document: HandoffContextV1 = {
    v: 1,
    kind: 'handoff-context',
    meta: {
      capturedAt: new Date().toISOString(),
      figmaFileKey: fileKey !== '' ? fileKey : 'unknown',
      frameUrl: frameUrl,
    },
    frames: capture.frames,
    components: mergedComponents,
    tokensUsed: mergedTokens,
    autoLayout: primaryAutoLayout,
  };

  const warnings = [...capture.warnings, ...buildWarnings];

  if (estimatePayloadBytes(document) > PLUGIN_DATA_MAX_BYTES) {
    warnings.push('Plugin-data export may exceed 100 kB — use clipboard or download');
  }

  const markdown = format(document, 'md');

  pluginLog(
    '[handoff] buildHandoffContext',
    String(document.frames.length) + ' frames',
    String(document.components.length) + ' components',
    String(document.tokensUsed.length) + ' tokens',
  );

  return { document: document, markdown: markdown, warnings: warnings };
}
