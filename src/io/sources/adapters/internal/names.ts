import type { CollectionId } from '@detroitlabs/figmint-contracts';

import { COLLECTION_ID_SET } from './constants';

export interface FormatErrorShape {
  kind: 'format-error';
  message: string;
  path?: string;
}

export class AdapterFormatError extends Error implements FormatErrorShape {
  readonly kind = 'format-error' as const;

  constructor(
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'AdapterFormatError';
  }
}

const MODE_ALIASES: Readonly<Record<string, string>> = {
  light: 'Light',
  dark: 'Dark',
  default: 'Default',
};

export function normalizeModeKey(mode: string): string {
  const lower = mode.toLowerCase();
  return MODE_ALIASES[lower] ?? mode;
}

export function dotSegmentsToSlashName(segments: string[]): string {
  return segments.map((segment) => segment.replace(/\./g, '/')).join('/');
}

export function rejectDotInName(name: string, path: string): void {
  if (name.includes('.')) {
    throw new AdapterFormatError(`Token name must use slashes, not dots: "${name}"`, path);
  }
}

export function isAdapterError(value: unknown): value is FormatErrorShape {
  return value instanceof AdapterFormatError;
}

const DTCG_ALIAS = /^\{([^}]+)\}$/;

export function parseDtcgAlias(
  curly: string,
  defaultCollection: CollectionId,
): { collection: CollectionId; name: string } {
  const match = DTCG_ALIAS.exec(curly.trim());
  if (!match) {
    throw new AdapterFormatError(`Invalid DTCG alias: ${curly}`);
  }
  const segments = match[1].split('.');
  const first = segments[0];
  if (COLLECTION_ID_SET.has(first as CollectionId)) {
    return {
      collection: first as CollectionId,
      name: dotSegmentsToSlashName(segments.slice(1)),
    };
  }
  return {
    collection: defaultCollection,
    name: dotSegmentsToSlashName(segments),
  };
}

const SLASH_ALIAS = /^[A-Za-z0-9][A-Za-z0-9/_-]*$/;

export function isSlashAlias(value: string): boolean {
  return SLASH_ALIAS.test(value) && value.includes('/');
}

export function resolveLegacyAlias(
  sourceCollection: CollectionId,
  aliasPath: string,
): { collection: CollectionId; name: string } {
  if (
    sourceCollection === 'theme' &&
    (aliasPath.startsWith('color/') || aliasPath.startsWith('color/state/'))
  ) {
    return { collection: 'primitives', name: aliasPath };
  }
  if (
    sourceCollection === 'layout' &&
    (aliasPath.startsWith('Space/') || aliasPath.startsWith('Corner/'))
  ) {
    return { collection: 'primitives', name: aliasPath };
  }
  if (sourceCollection === 'typography') {
    if (aliasPath.startsWith('typeface/') || aliasPath.startsWith('font/')) {
      return { collection: 'primitives', name: aliasPath };
    }
    if (
      aliasPath.startsWith('Body/') ||
      aliasPath.startsWith('Display/') ||
      aliasPath.startsWith('Headline/') ||
      aliasPath.startsWith('Label/') ||
      aliasPath.startsWith('Title/')
    ) {
      return { collection: 'typography', name: aliasPath };
    }
  }
  if (sourceCollection === 'effects' && aliasPath.startsWith('elevation/')) {
    return { collection: 'primitives', name: aliasPath };
  }
  if (
    sourceCollection === 'theme' ||
    sourceCollection === 'layout' ||
    sourceCollection === 'effects'
  ) {
    return { collection: 'primitives', name: aliasPath };
  }
  return { collection: 'primitives', name: aliasPath };
}

export function isTokensV1(raw: unknown): raw is import('@detroitlabs/figmint-contracts').TokensV1 {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  return obj.v === 1 && obj.kind === 'tokens';
}
