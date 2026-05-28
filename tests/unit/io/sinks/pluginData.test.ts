import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareSinkContent } from '@/io/sinks/prepareContent';
import {
  FIGHUB_PLUGIN_DATA_PREFIX,
  PLUGIN_DATA_MAX_BYTES,
  pluginDataKey,
  writeToPluginData,
} from '@/io/sinks/pluginData';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';
import { MockPage, installMockFigmaOutputPage, setMockCurrentPage } from './__mocks__/figmaOutputPage';

describe('pluginData', () => {
  beforeEach(() => {
    installMockFigmaOutputPage();
  });

  it('returns pluginDataKey with fighub prefix', () => {
    expect(pluginDataKey('drift-report')).toBe(FIGHUB_PLUGIN_DATA_PREFIX + 'drift-report');
  });

  it('writes JSON to selected node pluginData', async () => {
    const setPluginData = vi.fn();
    const node = { type: 'FRAME', setPluginData: setPluginData } as unknown as SceneNode;
    const page = new MockPage('Test');
    page.children = [];
    setMockCurrentPage(page);
    figma.currentPage.selection = [node];

    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'md' });
    const result = await writeToPluginData(doc, prepared);

    expect(result.ok).toBe(true);
    expect(setPluginData).toHaveBeenCalledWith('fighub:drift-report', prepared.json);
    expect(result.artifacts![0].destination).toBe('fighub:drift-report');
  });

  it('errors when selection is empty', async () => {
    figma.currentPage.selection = [];
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'json' });
    const result = await writeToPluginData(doc, prepared);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('exactly one');
  });

  it('errors when multiple nodes are selected', async () => {
    figma.currentPage.selection = [
      { setPluginData: vi.fn() } as unknown as SceneNode,
      { setPluginData: vi.fn() } as unknown as SceneNode,
    ];
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'json' });
    const result = await writeToPluginData(doc, prepared);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('exactly one');
  });

  it('errors when node does not support pluginData', async () => {
    figma.currentPage.selection = [{ type: 'GROUP' } as unknown as SceneNode];
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'json' });
    const result = await writeToPluginData(doc, prepared);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('does not support pluginData');
  });

  it('rejects payloads exceeding PLUGIN_DATA_MAX_BYTES', async () => {
    const setPluginData = vi.fn();
    figma.currentPage.selection = [
      { setPluginData: setPluginData } as unknown as SceneNode,
    ];
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'json' });
    prepared.json = 'x'.repeat(PLUGIN_DATA_MAX_BYTES + 1);

    const result = await writeToPluginData(doc, prepared);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds pluginData size limit');
    expect(setPluginData).not.toHaveBeenCalled();
  });
});
