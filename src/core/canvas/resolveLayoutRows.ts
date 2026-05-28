import type { Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { FigmaVariableSnapshot } from '@/core/audit/types';
import type { CodeSyntaxTriple } from '@/core/canvas/types';
import {
  aliasPathForToken,
  isPillRadius,
  isRadiusGroupKey,
  orderLayoutGroupKeys,
  readTokenCodeSyntax,
  resolveFloatPx,
} from '@/core/canvas/resolveShared';

export interface LayoutRow {
  tokenPath: string;
  resolvedPx: number;
  aliasPath: string | null;
  displayValue: string;
  codeSyntax: CodeSyntaxTriple;
  previewKind: 'bar' | 'square';
}

function layoutGroupKey(tokenName: string): string {
  return tokenName.split('/')[0].toLowerCase();
}

function toDisplayValue(resolvedPx: number): string {
  if (resolvedPx >= 9999) {
    return '∞';
  }
  return String(resolvedPx) + 'px';
}

/** Pure row resolution for ↳ Layout tables — grouped by first path segment. */
export function resolveLayoutRows(
  tokens: TokensV1,
  liveSnapshot: FigmaVariableSnapshot[],
): Record<string, LayoutRow[]> {
  const layoutTokens: Token[] = [];
  for (let i = 0; i < tokens.tokens.length; i++) {
    const token = tokens.tokens[i];
    if (token.collection === 'layout' && token.type === 'FLOAT') {
      layoutTokens.push(token);
    }
  }

  const buckets: Record<string, LayoutRow[]> = {};
  for (let ti = 0; ti < layoutTokens.length; ti++) {
    const token = layoutTokens[ti];
    const group = layoutGroupKey(token.name);
    const rawPx = resolveFloatPx(tokens, token, 'Default');
    const pill = isPillRadius(token.name, rawPx);
    const resolvedPx = pill ? 9999 : rawPx;
    const previewKind = isRadiusGroupKey(group) ? 'square' : 'bar';
    const row: LayoutRow = {
      tokenPath: token.name,
      resolvedPx: resolvedPx,
      aliasPath: aliasPathForToken(token, 'Default'),
      displayValue: toDisplayValue(resolvedPx),
      codeSyntax: readTokenCodeSyntax(token, liveSnapshot),
      previewKind: previewKind,
    };
    if (buckets[group] === undefined) {
      buckets[group] = [];
    }
    buckets[group].push(row);
  }

  const orderedKeys = orderLayoutGroupKeys(Object.keys(buckets));
  const ordered: Record<string, LayoutRow[]> = {};
  for (let ki = 0; ki < orderedKeys.length; ki++) {
    const key = orderedKeys[ki];
    const rows = buckets[key].slice();
    rows.sort(function (a, b) {
      return a.resolvedPx - b.resolvedPx;
    });
    ordered[key] = rows;
  }
  return ordered;
}

export function countLayoutRows(groups: Record<string, LayoutRow[]>): number {
  let count = 0;
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    count += groups[keys[i]].length;
  }
  return count;
}
