import type { Token, TokensV1 } from '@detroitlabs/figmint-contracts';

import type { FigmaVariableSnapshot } from '@/core/audit/types';
import type { CodeSyntaxTriple } from '@/core/canvas/types';
import { isColorValue } from '@/core/canvas/lib/colorFormats';
import { mapCodeSyntax } from '@/core/variables/codeSyntax';
import { resolveTokens } from '@/core/variables/resolveTokens';
import { isTokenAliasRef } from '@/core/variables/types';

export const LAYOUT_KNOWN_ORDER = [
  'space',
  'spacing',
  'padding',
  'radius',
  'corner',
  'border',
  'gap',
];

const RADIUS_GROUP_KEYS = new Set(['radius', 'corner']);

export function isRadiusGroupKey(groupKey: string): boolean {
  return RADIUS_GROUP_KEYS.has(groupKey.toLowerCase());
}

export function orderLayoutGroupKeys(keys: string[]): string[] {
  const known: string[] = [];
  for (let i = 0; i < LAYOUT_KNOWN_ORDER.length; i++) {
    const key = LAYOUT_KNOWN_ORDER[i];
    if (keys.includes(key)) {
      known.push(key);
    }
  }
  const rest = keys
    .filter(function (k) {
      return !LAYOUT_KNOWN_ORDER.includes(k);
    })
    .sort();
  return known.concat(rest);
}

function readLiveCodeSyntax(
  liveSnapshot: FigmaVariableSnapshot[],
  tokenName: string,
): CodeSyntaxTriple | null {
  for (let i = 0; i < liveSnapshot.length; i++) {
    const snap = liveSnapshot[i];
    if (snap.name !== tokenName) {
      continue;
    }
    const cs = snap.codeSyntax;
    return {
      WEB: cs.WEB !== undefined ? String(cs.WEB) : '',
      ANDROID: cs.ANDROID !== undefined ? String(cs.ANDROID) : '',
      iOS:
        cs.iOS !== undefined
          ? String(cs.iOS)
          : (cs as Record<string, string>).IOS !== undefined
            ? String((cs as Record<string, string>).IOS)
            : '',
    };
  }
  return null;
}

export function readTokenCodeSyntax(
  token: Token,
  liveSnapshot: FigmaVariableSnapshot[],
): CodeSyntaxTriple {
  const live = readLiveCodeSyntax(liveSnapshot, token.name);
  if (live !== null) {
    return live;
  }
  const mapped = mapCodeSyntax(token);
  return {
    WEB: mapped.WEB !== undefined ? mapped.WEB : '',
    ANDROID: mapped.ANDROID !== undefined ? mapped.ANDROID : '',
    iOS: mapped.iOS !== undefined ? mapped.iOS : '',
  };
}

export function aliasPathForToken(token: Token, modeName: string): string | null {
  const raw = token.valuesByMode[modeName];
  if (isTokenAliasRef(raw)) {
    return raw.aliasOf.name;
  }
  return null;
}

export function resolveFloatPx(tokens: TokensV1, token: Token, modeName: string): number {
  const resolved = resolveTokens(tokens);
  for (let i = 0; i < resolved.tokens.length; i++) {
    const view = resolved.tokens[i];
    if (view.collection !== token.collection || view.name !== token.name) {
      continue;
    }
    const val = view.resolvedValuesByMode[modeName];
    if (typeof val === 'number') {
      return val;
    }
    return 0;
  }
  return 0;
}

export function isPillRadius(tokenName: string, px: number): boolean {
  const lower = tokenName.toLowerCase();
  return lower.includes('full') || lower.includes('pill') || px >= 9999;
}

export function colorToRgbaString(color: { r: number; g: number; b: number; a?: number }): string {
  const a = color.a !== undefined ? color.a : 1;
  const alpha = Math.round(a * 100) / 100;
  return (
    'rgba(' +
    String(Math.round(color.r * 255)) +
    ',' +
    String(Math.round(color.g * 255)) +
    ',' +
    String(Math.round(color.b * 255)) +
    ',' +
    String(alpha) +
    ')'
  );
}

export { isColorValue };
