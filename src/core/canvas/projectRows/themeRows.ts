import type { Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import { colorToHex, colorToHsl, isColorValue } from '@/core/canvas/lib/colorFormats';
import type { CodeSyntaxTriple, ThemeRow } from '@/core/canvas/types';
import { resolveTokens } from '@/core/variables/resolveTokens';
import { isTokenAliasRef } from '@/core/variables/types';

export const THEME_GROUP_KNOWN_ORDER = [
  'background',
  'border',
  'primary',
  'secondary',
  'tertiary',
  'error',
  'state',
  'component',
  'button',
  'text',
];

export const THEME_GROUP_META: Record<string, { title: string; caption: string }> = {
  background: {
    title: 'Background',
    caption: 'Surfaces, containers, scrims, and overlays.',
  },
  border: {
    title: 'Border',
    caption: 'Stroke tokens for dividers and outlines.',
  },
  primary: {
    title: 'Primary',
    caption: 'Primary brand roles and their on-color companions.',
  },
  secondary: {
    title: 'Secondary',
    caption: 'Secondary brand roles for supporting actions.',
  },
  tertiary: {
    title: 'Tertiary',
    caption: 'Tertiary / decorative accent roles.',
  },
  error: {
    title: 'Error',
    caption: 'Feedback color for destructive and error states.',
  },
  state: {
    title: 'State',
    caption:
      'M3 state layer overlays — per-role RGBA tints for hover, pressed, and focus interactions.',
  },
  component: {
    title: 'Component',
    caption: 'shadcn-aligned component tokens (ring, input, muted, popover).',
  },
  button: {
    title: 'Button',
    caption: 'Component-level button state tokens.',
  },
  text: {
    title: 'Text',
    caption: 'Text and content color tokens.',
  },
};

function readCodeSyntax(token: Token): CodeSyntaxTriple {
  const cs = token.codeSyntax;
  return {
    WEB: cs !== undefined && cs.WEB !== undefined ? String(cs.WEB) : '',
    ANDROID: cs !== undefined && cs.ANDROID !== undefined ? String(cs.ANDROID) : '',
    iOS:
      cs !== undefined && cs.iOS !== undefined
        ? String(cs.iOS)
        : cs !== undefined && (cs as Record<string, string>).IOS !== undefined
          ? String((cs as Record<string, string>).IOS)
          : '',
  };
}

function themeGroupKey(tokenName: string): string | null {
  const parts = tokenName.split('/');
  if (parts.length < 2 || parts[0] !== 'color') {
    return null;
  }
  return parts[1].toLowerCase();
}

function resolveModeColor(
  token: Token,
  modeName: string,
  resolvedValuesByMode: Record<string, unknown>,
): { hex: string; hsl: string | null } {
  const raw = token.valuesByMode[modeName];
  if (isTokenAliasRef(raw)) {
    const resolved = resolvedValuesByMode[modeName];
    if (isColorValue(resolved)) {
      return { hex: colorToHex(resolved), hsl: colorToHsl(resolved) };
    }
    return { hex: '#000000', hsl: null };
  }
  if (isColorValue(raw)) {
    return { hex: colorToHex(raw), hsl: colorToHsl(raw) };
  }
  const resolved = resolvedValuesByMode[modeName];
  if (isColorValue(resolved)) {
    return { hex: colorToHex(resolved), hsl: colorToHsl(resolved) };
  }
  return { hex: '#000000', hsl: null };
}

function aliasForMode(token: Token, modeName: string): string | null {
  const raw = token.valuesByMode[modeName];
  if (isTokenAliasRef(raw)) {
    return raw.aliasOf.name;
  }
  return null;
}

function orderGroupKeys(keys: string[]): string[] {
  const known: string[] = [];
  for (let ki = 0; ki < THEME_GROUP_KNOWN_ORDER.length; ki++) {
    const key = THEME_GROUP_KNOWN_ORDER[ki];
    if (keys.includes(key)) {
      known.push(key);
    }
  }
  const rest = keys
    .filter(function (k) {
      return !THEME_GROUP_KNOWN_ORDER.includes(k);
    })
    .sort();
  return known.concat(rest);
}

/** Theme COLOR tokens grouped by semantic role (`color/{role}/…`). */
export function projectThemeGroupsFromTokens(tokens: TokensV1): Record<string, ThemeRow[]> {
  const resolved = resolveTokens(tokens);
  const tokenByName = new Map<string, Token>();
  for (let ti = 0; ti < tokens.tokens.length; ti++) {
    const token = tokens.tokens[ti];
    if (token.collection === 'theme') {
      tokenByName.set(token.name, token);
    }
  }

  const buckets: Record<string, ThemeRow[]> = {};

  for (let ri = 0; ri < resolved.tokens.length; ri++) {
    const view = resolved.tokens[ri];
    if (view.collection !== 'theme' || view.type !== 'COLOR') {
      continue;
    }
    const group = themeGroupKey(view.name);
    if (group === null) {
      continue;
    }
    const token = tokenByName.get(view.name);
    if (token === undefined) {
      continue;
    }

    const light = resolveModeColor(token, 'Light', view.resolvedValuesByMode);
    const dark = resolveModeColor(token, 'Dark', view.resolvedValuesByMode);

    const row: ThemeRow = {
      tokenPath: view.name,
      resolvedHexLight: light.hex,
      resolvedHexDark: dark.hex,
      resolvedHslLight: light.hsl,
      resolvedHslDark: dark.hsl,
      aliasLight: aliasForMode(token, 'Light'),
      aliasDark: aliasForMode(token, 'Dark'),
      codeSyntax: readCodeSyntax(token),
    };

    if (!buckets[group]) {
      buckets[group] = [];
    }
    buckets[group].push(row);
  }

  for (const groupKey of Object.keys(buckets)) {
    buckets[groupKey].sort(function (a, b) {
      return a.tokenPath.localeCompare(b.tokenPath);
    });
  }

  const ordered: Record<string, ThemeRow[]> = {};
  const keys = orderGroupKeys(Object.keys(buckets));
  for (let ki = 0; ki < keys.length; ki++) {
    ordered[keys[ki]] = buckets[keys[ki]];
  }
  return ordered;
}

export function countThemeSwatches(groups: Record<string, ThemeRow[]>): number {
  let count = 0;
  const keys = Object.keys(groups);
  for (let ki = 0; ki < keys.length; ki++) {
    count += groups[keys[ki]].length * 2;
  }
  return count;
}
