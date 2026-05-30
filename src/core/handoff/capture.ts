import { fileKeyResolutionWarning, resolveFigmaFileKey } from '@/core/figma/resolveFileKey';
import { pluginLog } from '@/core/pluginLog';

import { buildDeepLink } from './buildDeepLink';
import type { CaptureSelectionResult, CapturedFrame } from './types';
import { EXPORTABLE_NODE_TYPES, MAX_SELECTION_COUNT } from './types';

export { buildDeepLink } from './buildDeepLink';

export function pngToDataUrl(bytes: Uint8Array): string {
  return 'data:image/png;base64,' + uint8ArrayToBase64(bytes);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function isExportableNode(node: SceneNode): boolean {
  return EXPORTABLE_NODE_TYPES.has(node.type);
}

async function captureNode(
  node: SceneNode,
  fileKey: string,
  fileName: string,
): Promise<CapturedFrame> {
  const bytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 1 },
  });
  return {
    nodeId: node.id,
    name: node.name,
    deepLink: buildDeepLink(fileKey, fileName, node.id),
    screenshot: {
      format: 'png',
      dataUrl: pngToDataUrl(bytes),
    },
  };
}

export async function captureSelection(): Promise<CaptureSelectionResult> {
  const startMs = Date.now();
  const selection = figma.currentPage.selection;
  const warnings: string[] = [];
  const resolved = resolveFigmaFileKey();
  const fileKey = resolved.fileKey;
  const fileKeySource = resolved.source;

  pluginLog('[handoff] capture start', String(selection.length));

  if (selection.length === 0) {
    throw new Error('No selection');
  }

  if (selection.length > MAX_SELECTION_COUNT) {
    throw new Error('Selection exceeds maximum of 10 nodes');
  }

  const warning = fileKeyResolutionWarning(resolved);
  if (warning !== null) {
    warnings.push(warning);
  }

  const exportable: SceneNode[] = [];
  for (let i = 0; i < selection.length; i++) {
    const node = selection[i];
    if (isExportableNode(node)) {
      exportable.push(node);
    } else {
      pluginLog('[handoff] capture skip unsupported type', node.type, node.name);
    }
  }

  const fileName = figma.root.name;
  const captureResults = await Promise.all(
    exportable.map(async function (node) {
      try {
        return { ok: true as const, frame: await captureNode(node, fileKey, fileName) };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        pluginLog('[handoff] capture export failed', node.name, message);
        warnings.push('Export failed for "' + node.name + '": ' + message);
        return { ok: false as const };
      }
    }),
  );

  const frames: CapturedFrame[] = [];
  for (let i = 0; i < captureResults.length; i++) {
    const result = captureResults[i];
    if (result.ok) {
      frames.push(result.frame);
    }
  }

  pluginLog(
    '[handoff] capture complete',
    String(frames.length),
    String(Date.now() - startMs) + 'ms',
  );

  return { frames, warnings, fileKey, fileKeySource };
}
