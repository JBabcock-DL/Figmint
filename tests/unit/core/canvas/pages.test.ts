import { beforeEach, describe, expect, it } from 'vitest';

import { buildPageContent, findStyleGuidePage, isHeaderNode } from '@/core/canvas/lib/pages';
import { MockFrame, installMockFigmaCanvas } from './__mocks__/figmaFrames';

describe('pages', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('isHeaderNode matches _Header and header instance/component', () => {
    expect(isHeaderNode({ name: '_Header', type: 'FRAME' } as SceneNode)).toBe(true);
    expect(isHeaderNode({ name: 'header', type: 'INSTANCE' } as SceneNode)).toBe(true);
    expect(isHeaderNode({ name: 'Page Header', type: 'FRAME' } as SceneNode)).toBe(false);
    expect(isHeaderNode({ name: 'content', type: 'FRAME' } as SceneNode)).toBe(false);
  });

  it('buildPageContent removes non-header children and creates _PageContent', () => {
    const page = new MockFrame({ name: '↳ Primitives' }) as unknown as PageNode;
    const header = new MockFrame({ name: '_Header' });
    const stale = new MockFrame({ name: 'old-content' });
    page.appendChild(header as unknown as SceneNode);
    page.appendChild(stale as unknown as SceneNode);

    const content = buildPageContent(page);
    expect(content.name).toBe('_PageContent');
    expect(page.children.length).toBe(2);
    expect(page.children[0].name).toBe('_Header');
    expect(page.children[1].name).toBe('_PageContent');
  });

  it('findStyleGuidePage resolves legacy exact name', () => {
    const page = {
      type: 'PAGE',
      name: '↳ Theme',
      id: 'page-theme',
      getSharedPluginData: () => '',
    } as unknown as PageNode;
    (globalThis as Record<string, unknown>).figma = {
      root: { children: [page] },
      createFrame: () => new MockFrame(),
      createText: () => ({ characters: '', resize: () => undefined, textAutoResize: 'HEIGHT' }),
    };
    const found = findStyleGuidePage('theme');
    expect(found.name).toBe('↳ Theme');
  });
});
