import type { Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { FigmaVariableSnapshot } from '@/core/audit/types';
import type { CodeSyntaxTriple } from '@/core/canvas/types';
import {
  aliasPathForToken,
  colorToRgbaString,
  isColorValue,
  readTokenCodeSyntax,
  resolveFloatPx,
} from '@/core/canvas/resolveShared';
import { resolveTokens } from '@/core/variables/resolveTokens';

export type ShadowTier = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const TIER_NAMES: ShadowTier[] = ['sm', 'md', 'lg', 'xl', '2xl'];

export interface ShadowRow {
  tokenPath: string;
  tier: ShadowTier;
  blurPx: number;
  aliasPath: string;
  codeSyntax: CodeSyntaxTriple;
}

export interface ShadowColorRow {
  tokenPath: 'shadow/color';
  lightRgba: string;
  darkRgba: string;
  codeSyntax: CodeSyntaxTriple;
}

function resolveModeColor(
  tokens: TokensV1,
  token: Token,
  modeName: string,
): { r: number; g: number; b: number; a?: number } {
  const resolved = resolveTokens(tokens);
  for (let i = 0; i < resolved.tokens.length; i++) {
    const view = resolved.tokens[i];
    if (view.collection !== token.collection || view.name !== token.name) {
      continue;
    }
    const val = view.resolvedValuesByMode[modeName];
    if (isColorValue(val)) {
      return val;
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Pure row resolution for ↳ Effects tables — 5 shadow tiers + shadow/color. */
export function resolveEffectsRows(
  tokens: TokensV1,
  liveSnapshot: FigmaVariableSnapshot[],
): { shadows: ShadowRow[]; shadowColor: ShadowColorRow | null } {
  const floatTokens: Token[] = [];
  const colorTokens: Token[] = [];

  for (let i = 0; i < tokens.tokens.length; i++) {
    const token = tokens.tokens[i];
    if (token.collection !== 'effects') {
      continue;
    }
    if (token.type === 'FLOAT') {
      floatTokens.push(token);
    } else if (token.type === 'COLOR') {
      colorTokens.push(token);
    }
  }

  floatTokens.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  const shadows: ShadowRow[] = [];
  for (let fi = 0; fi < floatTokens.length; fi++) {
    const token = floatTokens[fi];
    const tier =
      TIER_NAMES[fi] !== undefined ? TIER_NAMES[fi] : (('tier' + String(fi + 1)) as ShadowTier);
    const alias = aliasPathForToken(token, 'Light') || aliasPathForToken(token, 'Dark') || '';
    shadows.push({
      tokenPath: token.name,
      tier: tier,
      blurPx: resolveFloatPx(tokens, token, 'Light'),
      aliasPath: alias,
      codeSyntax: readTokenCodeSyntax(token, liveSnapshot),
    });
  }

  let shadowColor: ShadowColorRow | null = null;
  for (let ci = 0; ci < colorTokens.length; ci++) {
    const token = colorTokens[ci];
    if (token.name !== 'shadow/color') {
      continue;
    }
    const light = resolveModeColor(tokens, token, 'Light');
    const dark = resolveModeColor(tokens, token, 'Dark');
    shadowColor = {
      tokenPath: 'shadow/color',
      lightRgba: colorToRgbaString(light),
      darkRgba: colorToRgbaString(dark),
      codeSyntax: readTokenCodeSyntax(token, liveSnapshot),
    };
    break;
  }

  return { shadows: shadows, shadowColor: shadowColor };
}
