import type { ColorValue, Token, TokensV1 } from '@detroitlabs/figmint-contracts';

import { resolveTokens } from '@/core/variables/resolveTokens';
import { isTokenAliasRef } from '@/core/variables/types';
import { colorToHex } from '@/core/canvas/lib/colorFormats';
import type {
  CodeSyntaxTriple,
  ColorRampRow,
  PrimitiveFloatRow,
  PrimitiveStringRow,
} from '@/core/canvas/types';

export const RAMP_ORDER = ['primary', 'secondary', 'tertiary', 'error', 'neutral'];

const SPACE_RE = /^(space|size|spacing)(\/|$)/i;
const RADIUS_RE = /^(corner|radius)(\/|$)/i;
const ELEV_RE = /^(elevation|elev|shadow|blur)(\/|$)/i;
const WEIGHT_RE = /weight/i;
const TYPEFACE_RE = /^(typeface|font|face)(\/|$)/i;

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

function sortRamps(keys: string[]): string[] {
  return keys.slice().sort(function (a, b) {
    const ia = RAMP_ORDER.indexOf(a);
    const ib = RAMP_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) {
      return ia - ib;
    }
    if (ia !== -1) {
      return -1;
    }
    if (ib !== -1) {
      return 1;
    }
    return a.localeCompare(b);
  });
}

function extractRampKey(tokenName: string): string | null {
  const parts = tokenName.split('/');
  if (parts.length < 2) {
    return null;
  }
  const lastSeg = parts[parts.length - 1];
  if (!/^\d+$/.test(lastSeg)) {
    return null;
  }
  const rampParts = parts.length === 2 ? [parts[0]] : parts.slice(1, -1);
  return rampParts
    .map(function (s) {
      return s.toLowerCase();
    })
    .join('/');
}

function resolvedColorHex(resolvedValuesByMode: Record<string, unknown>): string {
  const modes = Object.keys(resolvedValuesByMode);
  for (let mi = 0; mi < modes.length; mi++) {
    const val = resolvedValuesByMode[modes[mi]];
    if (typeof val === 'object' && val !== null && 'r' in val) {
      return colorToHex(val as ColorValue);
    }
  }
  return '#000000';
}

/** COLOR tokens matching `color/{ramp}/{numericStop}` grouped by ramp key. */
export function projectColorRampsFromTokens(tokens: TokensV1): Record<string, ColorRampRow[]> {
  const resolved = resolveTokens(tokens);
  const tokenByKey = new Map<string, Token>();
  for (let ti = 0; ti < tokens.tokens.length; ti++) {
    const token = tokens.tokens[ti];
    tokenByKey.set(token.collection + ':' + token.name, token);
  }

  const rampBuckets: Record<string, { stop: number; tokenPath: string }[]> = {};

  for (let ri = 0; ri < resolved.tokens.length; ri++) {
    const view = resolved.tokens[ri];
    if (view.collection !== 'primitives' || view.type !== 'COLOR') {
      continue;
    }
    const rampKey = extractRampKey(view.name);
    if (rampKey === null) {
      continue;
    }
    const parts = view.name.split('/');
    const stop = parseInt(parts[parts.length - 1], 10);
    if (!rampBuckets[rampKey]) {
      rampBuckets[rampKey] = [];
    }
    rampBuckets[rampKey].push({ stop: stop, tokenPath: view.name });
  }

  const result: Record<string, ColorRampRow[]> = {};
  const rampNames = sortRamps(Object.keys(rampBuckets));

  for (let ri = 0; ri < rampNames.length; ri++) {
    const ramp = rampNames[ri];
    const stops = rampBuckets[ramp].slice().sort(function (a, b) {
      return a.stop - b.stop;
    });
    result[ramp] = [];
    for (let si = 0; si < stops.length; si++) {
      const entry = stops[si];
      const token = tokenByKey.get('primitives:' + entry.tokenPath);
      const view = resolved.tokens.find(function (v) {
        return v.collection === 'primitives' && v.name === entry.tokenPath;
      });
      result[ramp].push({
        tokenPath: entry.tokenPath,
        resolvedHex: view !== undefined ? resolvedColorHex(view.resolvedValuesByMode) : '#000000',
        codeSyntax: token !== undefined ? readCodeSyntax(token) : { WEB: '', ANDROID: '', iOS: '' },
      });
    }
  }

  return result;
}

function projectFloatBucket(
  tokens: TokensV1,
  predicate: (name: string) => boolean,
  sortNumeric: boolean,
): PrimitiveFloatRow[] {
  const rows: PrimitiveFloatRow[] = [];
  for (let ti = 0; ti < tokens.tokens.length; ti++) {
    const token = tokens.tokens[ti];
    if (token.collection !== 'primitives' || token.type !== 'FLOAT') {
      continue;
    }
    if (!predicate(token.name)) {
      continue;
    }
    const modes = Object.keys(token.valuesByMode);
    let px = 0;
    for (let mi = 0; mi < modes.length; mi++) {
      const val = token.valuesByMode[modes[mi]];
      if (typeof val === 'number') {
        px = val;
        break;
      }
    }
    rows.push({
      tokenPath: token.name,
      resolvedPx: px,
      resolvedValue: String(px),
      codeSyntax: readCodeSyntax(token),
    });
  }
  if (sortNumeric) {
    rows.sort(function (a, b) {
      return a.resolvedPx - b.resolvedPx;
    });
  } else {
    rows.sort(function (a, b) {
      return a.tokenPath.localeCompare(b.tokenPath);
    });
  }
  return rows;
}

export function projectPrimitiveFloatRows(tokens: TokensV1): {
  space: PrimitiveFloatRow[];
  radius: PrimitiveFloatRow[];
  elevation: PrimitiveFloatRow[];
  fontWeight: PrimitiveFloatRow[];
} {
  const space = projectFloatBucket(
    tokens,
    function (name) {
      return SPACE_RE.test(name);
    },
    true,
  );

  const radius = projectFloatBucket(
    tokens,
    function (name) {
      return RADIUS_RE.test(name);
    },
    true,
  ).map(function (row) {
    const lower = row.tokenPath.toLowerCase();
    if (lower.includes('full') || lower.includes('pill') || row.resolvedPx >= 9999) {
      return Object.assign({}, row, { resolvedPx: 9999, resolvedValue: '9999' });
    }
    return row;
  });

  const elevation = projectFloatBucket(
    tokens,
    function (name) {
      return ELEV_RE.test(name);
    },
    false,
  );

  const fontWeight = projectFloatBucket(
    tokens,
    function (name) {
      return WEIGHT_RE.test(name);
    },
    false,
  );

  return { space: space, radius: radius, elevation: elevation, fontWeight: fontWeight };
}

export function projectPrimitiveStringRows(tokens: TokensV1): PrimitiveStringRow[] {
  const rows: PrimitiveStringRow[] = [];
  for (let ti = 0; ti < tokens.tokens.length; ti++) {
    const token = tokens.tokens[ti];
    if (token.collection !== 'primitives' || token.type !== 'STRING') {
      continue;
    }
    if (!TYPEFACE_RE.test(token.name)) {
      continue;
    }
    const modes = Object.keys(token.valuesByMode);
    let value = '';
    for (let mi = 0; mi < modes.length; mi++) {
      const val = token.valuesByMode[modes[mi]];
      if (typeof val === 'string') {
        value = val;
        break;
      }
      if (isTokenAliasRef(val)) {
        value = val.aliasOf.name;
        break;
      }
    }
    rows.push({
      tokenPath: token.name,
      resolvedValue: value,
      codeSyntax: readCodeSyntax(token),
    });
  }
  rows.sort(function (a, b) {
    return a.tokenPath.localeCompare(b.tokenPath);
  });
  return rows;
}
