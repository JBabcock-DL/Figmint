import type { ColorUtility } from './types';

const UTILITIES: ColorUtility[] = ['bg', 'text', 'border'];

const THEME_BLOCK_RE = /@theme(?:\s+inline)?\s*\{([^}]*)\}/g;
const CUSTOM_PROP_RE = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
const VAR_REF_RE = /var\(\s*(--[a-zA-Z0-9-]+)\s*\)/;

export interface CssThemeReadResult {
  /** Class fragment → semantic color name (e.g. `bg-primary` → `primary`). */
  rawMap: Record<string, string>;
}

function semanticFromColorVar(varName: string): string | null {
  if (varName.startsWith('--color-')) {
    return varName.slice('--color-'.length);
  }
  if (varName.startsWith('--theme-')) {
    return varName.slice('--theme-'.length);
  }
  if (varName.startsWith('--')) {
    return varName.slice(2);
  }
  return null;
}

function traceVarRef(value: string): string | null {
  const match = VAR_REF_RE.exec(value.trim());
  if (match === null) {
    return null;
  }
  return semanticFromColorVar(match[1]);
}

export function readCssThemeSource(text: string): CssThemeReadResult {
  const rawMap: Record<string, string> = {};
  const colorVarToSemantic: Record<string, string> = {};

  let blockMatch: RegExpExecArray | null;
  THEME_BLOCK_RE.lastIndex = 0;
  while ((blockMatch = THEME_BLOCK_RE.exec(text)) !== null) {
    const blockBody = blockMatch[1];
    let propMatch: RegExpExecArray | null;
    CUSTOM_PROP_RE.lastIndex = 0;
    while ((propMatch = CUSTOM_PROP_RE.exec(blockBody)) !== null) {
      const propName = '--' + propMatch[1];
      const propValue = propMatch[2].trim();
      if (!propName.startsWith('--color-') && !propName.startsWith('--theme-')) {
        continue;
      }
      let semantic = semanticFromColorVar(propName);
      const traced = traceVarRef(propValue);
      if (traced !== null) {
        semantic = traced;
      }
      if (semantic === null || semantic.length === 0) {
        continue;
      }
      colorVarToSemantic[propName] = semantic;
      if (propName.startsWith('--color-')) {
        for (let u = 0; u < UTILITIES.length; u++) {
          const utility = UTILITIES[u];
          rawMap[utility + '-' + semantic] = semantic;
        }
      }
    }
  }

  return { rawMap: rawMap };
}
