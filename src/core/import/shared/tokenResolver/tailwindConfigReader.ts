import type { ColorUtility } from './types';

const UTILITIES: ColorUtility[] = ['bg', 'text', 'border'];

const COLOR_ENTRY_RE =
  /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*\{[\s\S]*?DEFAULT\s*:\s*['"][^'"]*var\(\s*--([a-zA-Z0-9-]+)\s*\)[^'"]*['"]/g;

const SIMPLE_COLOR_RE =
  /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*['"][^'"]*var\(\s*--([a-zA-Z0-9-]+)\s*\)[^'"]*['"]/g;

export interface TailwindConfigReadResult {
  rawMap: Record<string, string>;
}

function addSemanticEntries(rawMap: Record<string, string>, semantic: string): void {
  for (let i = 0; i < UTILITIES.length; i++) {
    const utility = UTILITIES[i];
    rawMap[utility + '-' + semantic] = semantic;
  }
}

function extractColorsSection(text: string): string {
  const marker = 'colors:';
  const start = text.indexOf(marker);
  if (start === -1) {
    return text;
  }
  let index = start + marker.length;
  while (index < text.length && text[index] !== '{') {
    index += 1;
  }
  if (index >= text.length) {
    return text;
  }
  let depth = 0;
  const sliceStart = index;
  for (; index < text.length; index++) {
    const ch = text[index];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(sliceStart, index + 1);
      }
    }
  }
  return text.slice(sliceStart);
}

export function readTailwindConfigSource(text: string): TailwindConfigReadResult {
  const rawMap: Record<string, string> = {};
  const seen: Record<string, boolean> = {};
  const colorsSection = extractColorsSection(text);

  let match: RegExpExecArray | null;
  COLOR_ENTRY_RE.lastIndex = 0;
  while ((match = COLOR_ENTRY_RE.exec(colorsSection)) !== null) {
    const name = match[1];
    if (seen[name]) {
      continue;
    }
    seen[name] = true;
    addSemanticEntries(rawMap, name);
  }

  SIMPLE_COLOR_RE.lastIndex = 0;
  while ((match = SIMPLE_COLOR_RE.exec(colorsSection)) !== null) {
    const name = match[1];
    if (seen[name]) {
      continue;
    }
    seen[name] = true;
    addSemanticEntries(rawMap, name);
  }

  return { rawMap: rawMap };
}
