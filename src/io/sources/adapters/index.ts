import type { TokensV1, TokensV1Legacy, TokensV1WC3DTCG } from '@detroitlabs/fighub-contracts';

import { adaptDTCG } from './dtcg';
import { detectFormat, type TokenWireFormat } from './detect';
import { adaptLegacy } from './legacy';
import { isAdapterError, isTokensV1 } from './internal';

export interface FormatError {
  kind: 'format-error';
  message: string;
  path?: string;
}

export type { TokenWireFormat };

export { adaptDTCG } from './dtcg';
export { adaptLegacy } from './legacy';
export { detectFormat } from './detect';

function toFormatError(error: unknown): FormatError {
  if (isAdapterError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return { kind: 'format-error', message: error.message };
  }
  return { kind: 'format-error', message: 'Unknown adapter error' };
}

export function adapt(raw: unknown): TokensV1 | FormatError {
  if (isTokensV1(raw)) {
    if (!Array.isArray(raw.collections) || !Array.isArray(raw.tokens)) {
      return {
        kind: 'format-error',
        message: 'Canonical TokensV1 must include collections and tokens arrays',
      };
    }
    return {
      v: 1,
      kind: 'tokens',
      collections: raw.collections.slice(),
      tokens: raw.tokens.slice(),
      themes: raw.themes ? raw.themes.slice() : undefined,
    };
  }

  const fmt = detectFormat(raw);
  if (fmt === null) {
    return { kind: 'format-error', message: 'Unrecognized token wire format' };
  }

  try {
    if (fmt === 'dtcg') {
      return adaptDTCG(raw as TokensV1WC3DTCG);
    }
    return adaptLegacy(raw as TokensV1Legacy);
  } catch (error) {
    return toFormatError(error);
  }
}
