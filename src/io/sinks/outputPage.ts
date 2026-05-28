import type { FormatOptions, OutputFormat, SinkResult } from './types';
import type { PreparedContent } from './prepareContent';

export const FIGHUB_OUTPUT_PAGE_NAME = 'FigHub Output';
export const LEGACY_OUTPUT_PAGE_NAMES = ['Figmint Output', 'DesignOps Output'];
export const FIGHUB_OUTPUT_CONTENT_FRAME = '_FigHubOutputContent';
export const LEGACY_OUTPUT_CONTENT_FRAMES = ['_FigmintOutputContent'];
export const FIGHUB_SHARED_NS = 'fighub';
export const LEGACY_FIGHUB_SHARED_NS = 'figmint';
export const FIGHUB_PAGE_ROLE_KEY = 'pageRole';
export const FIGHUB_PAGE_ROLE_OUTPUT = 'output';

const CONTENT_FRAME_WIDTH = 960;

function listPages(): PageNode[] {
  const pages: PageNode[] = [];
  for (let i = 0; i < figma.root.children.length; i++) {
    const child = figma.root.children[i];
    if (child.type === 'PAGE') {
      pages.push(child);
    }
  }
  return pages;
}

function readOutputPageRole(page: PageNode): string {
  const role = page.getSharedPluginData(FIGHUB_SHARED_NS, FIGHUB_PAGE_ROLE_KEY);
  if (role.length > 0) {
    return role;
  }
  return page.getSharedPluginData(LEGACY_FIGHUB_SHARED_NS, FIGHUB_PAGE_ROLE_KEY) || '';
}

function findPagesByName(name: string): PageNode[] {
  const pages = listPages();
  const matches: PageNode[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].name === name) {
      matches.push(pages[i]);
    }
  }
  return matches;
}

export function findOrCreateOutputPage(): PageNode {
  const pages = listPages();

  for (let i = 0; i < pages.length; i++) {
    if (readOutputPageRole(pages[i]) === FIGHUB_PAGE_ROLE_OUTPUT) {
      return pages[i];
    }
  }

  const fighubMatches = findPagesByName(FIGHUB_OUTPUT_PAGE_NAME);
  if (fighubMatches.length > 0) {
    return fighubMatches[0];
  }

  for (let li = 0; li < LEGACY_OUTPUT_PAGE_NAMES.length; li++) {
    const legacyName = LEGACY_OUTPUT_PAGE_NAMES[li];
    const legacyMatches = findPagesByName(legacyName);
    if (legacyMatches.length === 1) {
      return legacyMatches[0];
    }
  }

  const page = figma.createPage();
  page.name = FIGHUB_OUTPUT_PAGE_NAME;
  page.setSharedPluginData(
    FIGHUB_SHARED_NS,
    FIGHUB_PAGE_ROLE_KEY,
    FIGHUB_PAGE_ROLE_OUTPUT,
  );
  figma.root.appendChild(page);
  figma.currentPage = page;
  return page;
}

function isOutputContentFrame(name: string): boolean {
  if (name === FIGHUB_OUTPUT_CONTENT_FRAME) {
    return true;
  }
  for (let i = 0; i < LEGACY_OUTPUT_CONTENT_FRAMES.length; i++) {
    if (name === LEGACY_OUTPUT_CONTENT_FRAMES[i]) {
      return true;
    }
  }
  return false;
}

export function findOrCreateContentFrame(page: PageNode): FrameNode {
  for (let i = 0; i < page.children.length; i++) {
    const child = page.children[i];
    if (child.type === 'FRAME' && isOutputContentFrame(child.name)) {
      return child;
    }
  }

  const frame = figma.createFrame();
  frame.name = FIGHUB_OUTPUT_CONTENT_FRAME;
  frame.layoutMode = 'VERTICAL';
  frame.resize(CONTENT_FRAME_WIDTH, 100);
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  page.appendChild(frame);
  return frame;
}

function pickContent(prepared: PreparedContent, format: OutputFormat | 'both'): string {
  if (format === 'json') {
    return prepared.json;
  }
  return prepared.markdown;
}

async function ensureInterRegular(): Promise<void> {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  } catch {
    // Figma may substitute if Inter is unavailable.
  }
}

export async function writeToOutputPage(
  prepared: PreparedContent,
  options: FormatOptions,
): Promise<SinkResult> {
  const content = pickContent(prepared, options.format);
  const label = prepared.label;
  const byteLength = new TextEncoder().encode(content).length;

  try {
    const page = findOrCreateOutputPage();
    const frame = findOrCreateContentFrame(page);
    await ensureInterRegular();

    let textNode: TextNode | null = null;
    for (let i = 0; i < frame.children.length; i++) {
      const child = frame.children[i];
      if (child.type === 'TEXT' && child.name === label) {
        textNode = child;
        break;
      }
    }

    if (textNode === null) {
      textNode = figma.createText();
      textNode.name = label;
      frame.appendChild(textNode);
    }

    textNode.characters = content;

    return {
      ok: true,
      sink: 'output-page',
      message: 'Wrote to Output page',
      artifacts: [
        {
          format: options.format === 'json' ? 'json' : 'md',
          byteLength: byteLength,
          destination: label,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      sink: 'output-page',
      message: 'Output page write failed',
      error: message,
    };
  }
}
