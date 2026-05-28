import type { ContractKind, LoadedDocument } from '@/io/sources/types';

import type { PreparedContent } from './prepareContent';
import type { SinkResult } from './types';

export const FIGHUB_PLUGIN_DATA_PREFIX = 'fighub:';
export const PLUGIN_DATA_MAX_BYTES = 100_000;

export function pluginDataKey(kind: ContractKind): string {
  return FIGHUB_PLUGIN_DATA_PREFIX + kind;
}

export function writeToPluginData(
  doc: LoadedDocument,
  prepared: PreparedContent,
): Promise<SinkResult> {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    return Promise.resolve({
      ok: false,
      sink: 'plugin-data',
      message: 'pluginData export requires a single selection',
      error: 'Select exactly one frame or node for pluginData export',
    });
  }

  const target = selection[0];
  if (!('setPluginData' in target) || typeof target.setPluginData !== 'function') {
    return Promise.resolve({
      ok: false,
      sink: 'plugin-data',
      message: 'Selected node does not support pluginData',
      error: 'Selected node does not support pluginData',
    });
  }

  const value = prepared.json;
  const byteLength = new TextEncoder().encode(value).length;

  if (value.length > PLUGIN_DATA_MAX_BYTES) {
    return Promise.resolve({
      ok: false,
      sink: 'plugin-data',
      message: 'Payload exceeds pluginData size limit',
      error:
        'JSON payload (' +
        String(value.length) +
        ' bytes) exceeds pluginData size limit (' +
        String(PLUGIN_DATA_MAX_BYTES) +
        ' bytes). Use download or Output page instead.',
    });
  }

  try {
    const key = pluginDataKey(doc.kind);
    target.setPluginData(key, value);

    return Promise.resolve({
      ok: true,
      sink: 'plugin-data',
      message: 'Wrote pluginData on selected node',
      artifacts: [
        {
          format: 'json',
          byteLength: byteLength,
          destination: key,
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Promise.resolve({
      ok: false,
      sink: 'plugin-data',
      message: 'pluginData write failed',
      error: message,
    });
  }
}
