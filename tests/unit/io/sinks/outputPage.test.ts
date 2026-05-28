import { beforeEach, describe, expect, it } from 'vitest';

import { prepareSinkContent } from '@/io/sinks/prepareContent';
import {
  FIGMINT_OUTPUT_CONTENT_FRAME,
  FIGMINT_OUTPUT_PAGE_NAME,
  FIGMINT_PAGE_ROLE_KEY,
  FIGMINT_PAGE_ROLE_OUTPUT,
  FIGMINT_SHARED_NS,
  findOrCreateContentFrame,
  findOrCreateOutputPage,
  writeToOutputPage,
} from '@/io/sinks/outputPage';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';
import {
  MockPage,
  getMockOutputPages,
  installMockFigmaOutputPage,
  resetMockFigmaOutputPage,
  setMockCurrentPage,
} from './__mocks__/figmaOutputPage';

describe('outputPage', () => {
  beforeEach(() => {
    installMockFigmaOutputPage();
  });

  it('creates Figmint Output page on first use', () => {
    const page = findOrCreateOutputPage();

    expect(page.name).toBe(FIGMINT_OUTPUT_PAGE_NAME);
    expect(page.getSharedPluginData(FIGMINT_SHARED_NS, FIGMINT_PAGE_ROLE_KEY)).toBe(
      FIGMINT_PAGE_ROLE_OUTPUT,
    );
    expect(getMockOutputPages().length).toBe(2);
  });

  it('resolves legacy DesignOps Output page by name', () => {
    const legacy = new MockPage('DesignOps Output');
    getMockOutputPages().push(legacy);

    const page = findOrCreateOutputPage();
    expect(page.name).toBe('DesignOps Output');
  });

  it('creates content frame with expected name', () => {
    const page = findOrCreateOutputPage() as unknown as MockPage;
    const frame = findOrCreateContentFrame(page as unknown as PageNode);

    expect(frame.name).toBe(FIGMINT_OUTPUT_CONTENT_FRAME);
    expect(frame.layoutMode).toBe('VERTICAL');
  });

  it('updates existing text node by label', async () => {
    const page = findOrCreateOutputPage() as unknown as MockPage;
    const frame = findOrCreateContentFrame(page as unknown as PageNode);
    const existing = figma.createText();
    existing.name = 'figmint/drift-report/2026-05-27T12:00:00.000Z';
    existing.characters = 'old content';
    frame.appendChild(existing);

    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'md' });
    const result = await writeToOutputPage(prepared, { format: 'md' });

    expect(result.ok).toBe(true);
    expect(existing.characters).toContain('# drift-report v1');
    expect(frame.children.length).toBe(1);
  });

  it('writes markdown when format is both', async () => {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'both' });
    const result = await writeToOutputPage(prepared, { format: 'both' });

    expect(result.ok).toBe(true);
    const page = findOrCreateOutputPage() as unknown as MockPage;
    const frame = findOrCreateContentFrame(page as unknown as PageNode);
    const textNode = frame.children[0] as TextNode;
    expect(textNode.characters).toContain('## ↑ Push');
  });

  it('sets currentPage when creating a new output page', () => {
    resetMockFigmaOutputPage();
    installMockFigmaOutputPage();

    const page = findOrCreateOutputPage();
    expect(figma.currentPage).toBe(page);
  });

  it('does not switch currentPage when reusing existing page', () => {
    const other = new MockPage('Other Page');
    getMockOutputPages().push(other);
    setMockCurrentPage(other);

    const existing = new MockPage(FIGMINT_OUTPUT_PAGE_NAME);
    existing.setSharedPluginData(FIGMINT_SHARED_NS, FIGMINT_PAGE_ROLE_KEY, FIGMINT_PAGE_ROLE_OUTPUT);
    getMockOutputPages().push(existing);

    findOrCreateOutputPage();
    expect(figma.currentPage).toBe(other as unknown as PageNode);
  });
});
