/// <reference types="@figma/plugin-typings" />

import { MockFrame, MockTextNode, resetMockFigmaFrames } from '../../../core/canvas/__mocks__/figmaFrames';

let nextPageId = 1;

export class MockPage {
  readonly type = 'PAGE' as const;
  id: string;
  name = 'Page';
  children: SceneNode[] = [];
  selection: SceneNode[] = [];
  private sharedPluginData: Record<string, Record<string, string>> = {};

  constructor(name?: string) {
    this.id = 'page-' + String(nextPageId++);
    if (name !== undefined) {
      this.name = name;
    }
  }

  getSharedPluginData(namespace: string, key: string): string {
    const ns = this.sharedPluginData[namespace];
    if (ns === undefined) {
      return '';
    }
    const value = ns[key];
    return value !== undefined ? value : '';
  }

  setSharedPluginData(namespace: string, key: string, value: string): void {
    if (this.sharedPluginData[namespace] === undefined) {
      this.sharedPluginData[namespace] = {};
    }
    this.sharedPluginData[namespace][key] = value;
  }

  appendChild(child: SceneNode): void {
    (child as { parent?: MockPage | null }).parent = this;
    this.children.push(child);
  }

  insertChild(index: number, child: SceneNode): void {
    const previousParent = (child as { parent?: MockPage | null }).parent;
    if (previousParent !== undefined && previousParent !== null) {
      const prevIndex = previousParent.children.indexOf(child);
      if (prevIndex >= 0) {
        previousParent.children.splice(prevIndex, 1);
      }
    }
    (child as { parent?: MockPage | null }).parent = this;
    const clamped = index < 0 ? 0 : index;
    this.children.splice(clamped, 0, child);
  }
}

export function resetMockFigmaOutputPage(): void {
  resetMockFigmaFrames();
  nextPageId = 1;
}

export function installMockFigmaOutputPage(): void {
  resetMockFigmaOutputPage();

  const pages: MockPage[] = [];
  let currentPage: MockPage = new MockPage('Page 1');
  pages.push(currentPage);

  const globalRecord = globalThis as Record<string, unknown>;

  globalRecord.figma = {
    root: {
      children: pages as unknown as PageNode[],
      appendChild: function (page: PageNode) {
        pages.push(page as unknown as MockPage);
      },
    },
    currentPage: currentPage as unknown as PageNode,
    createPage: function () {
      return new MockPage() as unknown as PageNode;
    },
    createFrame: function () {
      return new MockFrame() as unknown as FrameNode;
    },
    createText: function () {
      return new MockTextNode() as unknown as TextNode;
    },
    loadFontAsync: function () {
      return Promise.resolve();
    },
  };

  globalRecord.__mockOutputPages = pages;
  globalRecord.__mockSetCurrentPage = function (page: MockPage) {
    currentPage = page;
    (globalRecord.figma as { currentPage: PageNode }).currentPage = page as unknown as PageNode;
  };
  globalRecord.__mockGetOutputPages = function () {
    return pages;
  };
}

export function getMockOutputPages(): MockPage[] {
  return (globalThis as Record<string, unknown>).__mockOutputPages as MockPage[];
}

export function setMockCurrentPage(page: MockPage): void {
  const setter = (globalThis as Record<string, unknown>).__mockSetCurrentPage as (
    page: MockPage,
  ) => void;
  setter(page);
}
