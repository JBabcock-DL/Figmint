import type {
  CodeSyntaxPlatform,
  Collection,
  CollectionId,
  ColorValue,
  LegacyTokenCollection,
  Token,
  TokenAliasRef,
  TokensV1,
  TokensV1Legacy,
} from '@detroitlabs/figmint-contracts';

import {
  AdapterFormatError,
  CANONICAL_COLLECTION_ORDER,
  COLLECTION_MODES,
  isColorValue,
  isSlashAlias,
  LEGACY_TO_COLLECTION_ID,
  normalizeModeKey,
  parseColorLiteral,
  rejectDotInName,
  resolveLegacyAlias,
} from './internal';

type ModeValue = ColorValue | number | boolean | string | TokenAliasRef;

function parseLegacyValue(
  sourceCollection: CollectionId,
  raw: string | number | boolean | ColorValue,
  path: string,
): ModeValue {
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }
  if (isColorValue(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const color = parseColorLiteral(raw);
    if (color) {
      return color;
    }
    if (isSlashAlias(raw)) {
      return { aliasOf: resolveLegacyAlias(sourceCollection, raw) };
    }
    return raw;
  }
  throw new AdapterFormatError(`Unsupported legacy value at ${path}`, path);
}

function copyCodeSyntax(
  codeSyntax: Partial<Record<CodeSyntaxPlatform, string>> | undefined,
  path: string,
): Partial<Record<CodeSyntaxPlatform, string>> | undefined {
  if (!codeSyntax) {
    return undefined;
  }
  if ('IOS' in codeSyntax) {
    throw new AdapterFormatError('Use iOS (not IOS) for codeSyntax platform key', path);
  }
  return { ...codeSyntax };
}

function buildCollections(): Collection[] {
  return CANONICAL_COLLECTION_ORDER.map((id) => ({
    id,
    modes: COLLECTION_MODES[id],
  }));
}

export function adaptLegacy(input: TokensV1Legacy): TokensV1 {
  const tokens: Token[] = [];
  const collectionMap = new Map<LegacyTokenCollection['name'], LegacyTokenCollection>(
    input.collections.map((collection) => [collection.name, collection]),
  );

  for (const collectionId of CANONICAL_COLLECTION_ORDER) {
    const legacyName = Object.entries(LEGACY_TO_COLLECTION_ID).find(
      ([, id]) => id === collectionId,
    )?.[0] as LegacyTokenCollection['name'] | undefined;
    if (!legacyName) {
      continue;
    }
    const collection = collectionMap.get(legacyName);
    if (!collection) {
      continue;
    }

    for (const variable of collection.variables) {
      const path = `${legacyName}/${variable.name}`;
      rejectDotInName(variable.name, path);

      const tokenType = variable.type ?? (collectionId === 'theme' ? 'COLOR' : undefined);
      if (!tokenType) {
        throw new AdapterFormatError(`Missing token type for ${path}`, path);
      }

      const valuesByMode: Record<string, ModeValue> = {};
      for (const [modeKey, rawValue] of Object.entries(variable.valuesByMode)) {
        const mode = normalizeModeKey(modeKey);
        valuesByMode[mode] = parseLegacyValue(collectionId, rawValue, `${path}/${mode}`);
      }

      const base = {
        collection: collectionId,
        name: variable.name,
        description: variable.description,
        codeSyntax: copyCodeSyntax(variable.codeSyntax, path),
      };

      switch (tokenType) {
        case 'COLOR':
          tokens.push({
            ...base,
            type: 'COLOR',
            valuesByMode: valuesByMode as Record<string, ColorValue | TokenAliasRef>,
          });
          break;
        case 'FLOAT':
          tokens.push({
            ...base,
            type: 'FLOAT',
            valuesByMode: valuesByMode as Record<string, number | TokenAliasRef>,
          });
          break;
        case 'STRING':
          tokens.push({
            ...base,
            type: 'STRING',
            valuesByMode: valuesByMode as Record<string, string | TokenAliasRef>,
          });
          break;
        case 'BOOLEAN':
          tokens.push({
            ...base,
            type: 'BOOLEAN',
            valuesByMode: valuesByMode as Record<string, boolean | TokenAliasRef>,
          });
          break;
        default:
          throw new AdapterFormatError(`Unsupported token type ${String(tokenType)}`, path);
      }
    }
  }

  return {
    v: 1,
    kind: 'tokens',
    collections: buildCollections(),
    tokens,
  };
}
