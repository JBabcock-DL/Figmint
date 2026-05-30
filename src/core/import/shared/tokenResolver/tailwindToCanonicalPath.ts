import type { ColorSlot, ColorUtility } from './types';

function slotForUtility(utility: ColorUtility): ColorSlot {
  if (utility === 'text') {
    return 'content';
  }
  return 'default';
}

/** Shadcn baseline when design tokens file is unavailable. */
const DEFAULT_SEMANTIC_TABLE: {
  semantic: string;
  utility: ColorUtility;
  path: string;
}[] = [
  { semantic: 'primary', utility: 'bg', path: 'color/primary/default' },
  { semantic: 'primary', utility: 'text', path: 'color/primary/content' },
  { semantic: 'muted', utility: 'bg', path: 'color/muted/default' },
  { semantic: 'muted-foreground', utility: 'text', path: 'color/muted/content' },
  { semantic: 'destructive', utility: 'bg', path: 'color/destructive/default' },
];

function extractWebCssVar(webSyntax: string): string | null {
  const trimmed = webSyntax.trim();
  const match = /^var\((--[a-zA-Z0-9-]+)\)$/.exec(trimmed);
  if (match === null) {
    return null;
  }
  return match[1];
}

/**
 * Walk `design/tokens.json` theme.color.* WEB codeSyntax entries.
 * Keys: CSS var name (e.g. `--color-primary-default`) → canonical path (`color/primary/default`).
 */
export function buildCanonicalMapFromDesignTokens(tokensJson: unknown): Record<string, string> {
  const map: Record<string, string> = {};
  if (typeof tokensJson !== 'object' || tokensJson === null || Array.isArray(tokensJson)) {
    return map;
  }
  const root = tokensJson as Record<string, unknown>;
  const theme = root.theme;
  if (typeof theme !== 'object' || theme === null || Array.isArray(theme)) {
    return map;
  }
  const themeRecord = theme as Record<string, unknown>;
  const color = themeRecord.color;
  if (typeof color !== 'object' || color === null || Array.isArray(color)) {
    return map;
  }
  walkThemeColor(color as Record<string, unknown>, 'color', map);
  return map;
}

function walkThemeColor(
  node: Record<string, unknown>,
  prefix: string,
  map: Record<string, string>,
): void {
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = node[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.$value === 'string' || record.$type === 'color') {
      const path = prefix + '/' + key;
      const extensions = record.$extensions;
      if (typeof extensions === 'object' && extensions !== null && !Array.isArray(extensions)) {
        const fighub = (extensions as Record<string, unknown>).fighub;
        if (typeof fighub === 'object' && fighub !== null && !Array.isArray(fighub)) {
          const codeSyntax = (fighub as Record<string, unknown>).codeSyntax;
          if (typeof codeSyntax === 'object' && codeSyntax !== null && !Array.isArray(codeSyntax)) {
            const web = (codeSyntax as Record<string, unknown>).WEB;
            if (typeof web === 'string') {
              const cssVar = extractWebCssVar(web);
              if (cssVar !== null) {
                map[cssVar] = path;
              }
            }
          }
        }
      }
      continue;
    }
    walkThemeColor(record, prefix + '/' + key, map);
  }
}

export function resolveCanonicalPath(
  semantic: string,
  _slot: ColorSlot,
  utility: ColorUtility,
  map: Record<string, string>,
): string | null {
  const cssVarDefault = '--color-' + semantic + '-default';
  const cssVarContent = '--color-' + semantic + '-content';
  const cssVarSubtle = '--color-' + semantic + '-subtle';
  const cssVarPlain = '--color-' + semantic;
  const cssVarTheme = '--' + semantic;

  const effectiveSlot = slotForUtility(utility);
  const candidates: string[] = [];
  if (effectiveSlot === 'content') {
    candidates.push(cssVarContent, cssVarPlain, cssVarDefault);
  } else if (effectiveSlot === 'subtle') {
    candidates.push(cssVarSubtle, cssVarPlain, cssVarDefault);
  } else {
    candidates.push(cssVarDefault, cssVarPlain, cssVarTheme);
  }

  for (let i = 0; i < candidates.length; i++) {
    const hit = map[candidates[i]];
    if (typeof hit === 'string' && hit.length > 0) {
      return hit;
    }
  }

  const themePath = 'color/' + semantic + '/' + effectiveSlot;
  if (map[themePath] !== undefined) {
    return map[themePath];
  }

  for (let j = 0; j < DEFAULT_SEMANTIC_TABLE.length; j++) {
    const row = DEFAULT_SEMANTIC_TABLE[j];
    if (row.semantic === semantic && row.utility === utility) {
      return row.path;
    }
  }

  const fallbackThemeKey = 'color.' + semantic + '.' + effectiveSlot;
  const fromThemeKey = map[fallbackThemeKey];
  if (typeof fromThemeKey === 'string') {
    return fromThemeKey;
  }

  return null;
}

/** Build semantic-keyed shortcuts for resolveCanonicalPath default table. */
export function buildDefaultCanonicalMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < DEFAULT_SEMANTIC_TABLE.length; i++) {
    const row = DEFAULT_SEMANTIC_TABLE[i];
    const key = row.semantic + ':' + row.utility;
    map[key] = row.path;
  }
  return map;
}

export function resolveCanonicalPathForFragment(
  utility: ColorUtility,
  semantic: string,
  designTokenMap: Record<string, string>,
): string | null {
  const slot = slotForUtility(utility);
  const shortcutKey = semantic + ':' + utility;
  const shortcut = designTokenMap[shortcutKey];
  if (typeof shortcut === 'string' && shortcut.length > 0) {
    return shortcut;
  }
  return resolveCanonicalPath(semantic, slot, utility, designTokenMap);
}
