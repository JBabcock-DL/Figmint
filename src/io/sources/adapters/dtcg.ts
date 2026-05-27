// W3C Design Tokens Format Module — https://design-tokens.github.io/community-group/format/
import type {
  CodeSyntaxPlatform,
  Collection,
  CollectionId,
  ColorValue,
  DtcgTokenType,
  Token,
  TokenAliasRef,
  TokensV1,
  TokensV1WC3DTCG,
  TokensV1WC3DTCGGroup,
  TokensV1WC3DTCGNode,
} from '@detroitlabs/figmint-contracts';

import {
  AdapterFormatError,
  CANONICAL_COLLECTION_ORDER,
  COLLECTION_ID_SET,
  COLLECTION_MODES,
  isColorValue,
  parseColorLiteral,
  parseDimension,
  parseDtcgAlias,
  rejectDotInName,
  UNSUPPORTED_DTCG_TYPES,
} from './internal';
import { normalizeDtcgTopLevel } from './normalizeDtcgTopLevel';

type ParsedModeValue = ColorValue | number | boolean | string | TokenAliasRef;

interface FigmintExtensions {
  modes?: Record<string, unknown>;
  codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>;
}

function buildCollections(): Collection[] {
  return CANONICAL_COLLECTION_ORDER.map((id) => ({
    id,
    modes: COLLECTION_MODES[id],
  }));
}

function defaultModeForCollection(collectionId: CollectionId): string {
  return collectionId === 'theme' || collectionId === 'effects' ? 'Light' : 'Default';
}

function mapDtcgTypeToTokenType(dtcgType: DtcgTokenType): Token['type'] {
  switch (dtcgType) {
    case 'color':
    case 'shadow':
      return 'COLOR';
    case 'dimension':
    case 'number':
    case 'fontWeight':
    case 'duration':
      return 'FLOAT';
    case 'fontFamily':
    case 'cubicBezier':
      return 'STRING';
    default:
      throw new AdapterFormatError(`Unsupported DTCG type: ${dtcgType}`);
  }
}

function parseLeafValue(
  raw: unknown,
  dtcgType: DtcgTokenType,
  collectionId: CollectionId,
  path: string,
): ParsedModeValue {
  if (UNSUPPORTED_DTCG_TYPES.has(dtcgType)) {
    throw new AdapterFormatError(`Unsupported DTCG type "${dtcgType}" in v1 adapters`, path);
  }
  if (dtcgType === 'typography') {
    throw new AdapterFormatError('Typography composites must be decomposed before adaptDTCG', path);
  }
  if (typeof raw === 'string') {
    const aliasMatch = /^\{([^}]+)\}$/.exec(raw.trim());
    if (aliasMatch) {
      return { aliasOf: parseDtcgAlias(raw, collectionId) };
    }
    if (dtcgType === 'color') {
      const color = parseColorLiteral(raw);
      if (!color) {
        throw new AdapterFormatError(`Invalid color value: ${raw}`, path);
      }
      return color;
    }
    if (dtcgType === 'dimension') {
      const dimension = parseDimension(raw);
      if (dimension === null) {
        throw new AdapterFormatError(`Invalid dimension value: ${raw}`, path);
      }
      return dimension;
    }
    return raw;
  }
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (isColorValue(raw) && dtcgType === 'color') {
    return raw;
  }
  if (typeof raw === 'object' && raw !== null && dtcgType === 'shadow') {
    return decomposeShadow(raw as Record<string, unknown>, path);
  }
  throw new AdapterFormatError(`Unsupported $value for type ${dtcgType}`, path);
}

function decomposeShadow(raw: Record<string, unknown>, path: string): ColorValue {
  const color = raw.color;
  if (typeof color === 'string') {
    const parsed = parseColorLiteral(color);
    if (parsed) {
      return parsed;
    }
  }
  throw new AdapterFormatError(`Unsupported shadow composite at ${path}`, path);
}

function readCodeSyntax(value: unknown): Partial<Record<CodeSyntaxPlatform, string>> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const output: Partial<Record<CodeSyntaxPlatform, string>> = {};
  for (const key of ['WEB', 'ANDROID', 'iOS'] as const) {
    if (typeof record[key] === 'string') {
      output[key] = record[key];
    }
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

function extractFigmintExtensions(
  extensions: Record<string, unknown> | undefined,
): FigmintExtensions {
  const figmint = extensions?.figmint;
  if (typeof figmint !== 'object' || figmint === null) {
    return {};
  }
  const candidate = figmint as Record<string, unknown>;
  return {
    modes:
      typeof candidate.modes === 'object' && candidate.modes !== null
        ? (candidate.modes as Record<string, unknown>)
        : undefined,
    codeSyntax: readCodeSyntax(candidate.codeSyntax),
  };
}

function splitVendorExtensions(
  extensions: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!extensions) {
    return undefined;
  }
  const vendor: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extensions)) {
    if (key !== 'figmint') {
      vendor[key] = value;
    }
  }
  return Object.keys(vendor).length > 0 ? vendor : undefined;
}

function isLeafNode(node: TokensV1WC3DTCGNode): boolean {
  return '$value' in node;
}

interface DtcgTokenLeafShape {
  $value: unknown;
  $type?: DtcgTokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
}

function asLeaf(node: TokensV1WC3DTCGNode): DtcgTokenLeafShape {
  return node as DtcgTokenLeafShape;
}

function pushToken(tokens: Token[], token: Token): void {
  tokens.push(token);
}

function isGroupNode(node: TokensV1WC3DTCGNode): node is TokensV1WC3DTCGGroup {
  return !('$value' in node);
}

function resolveInheritedType(
  node: TokensV1WC3DTCGNode,
  inheritedType: DtcgTokenType | undefined,
): DtcgTokenType | undefined {
  if (isLeafNode(node)) {
    return asLeaf(node).$type ?? inheritedType;
  }
  if (isGroupNode(node) && typeof node.$type === 'string') {
    return node.$type;
  }
  return inheritedType;
}

function walkGroup(
  collectionId: CollectionId,
  node: TokensV1WC3DTCGGroup,
  pathSegments: string[],
  inheritedType: DtcgTokenType | undefined,
  tokens: Token[],
): void {
  const groupType = typeof node.$type === 'string' ? node.$type : inheritedType;

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || child === undefined || typeof child === 'string') {
      continue;
    }
    const childPath = [...pathSegments, key];
    const childPathStr = `${collectionId}/${childPath.join('/')}`;
    walkNode(collectionId, child, childPath, groupType, tokens, childPathStr);
  }
}

function walkNode(
  collectionId: CollectionId,
  node: TokensV1WC3DTCGNode,
  pathSegments: string[],
  inheritedType: DtcgTokenType | undefined,
  tokens: Token[],
  path: string,
): void {
  const resolvedType = resolveInheritedType(node, inheritedType);
  if (isLeafNode(node)) {
    if (!resolvedType) {
      throw new AdapterFormatError('Missing $type on DTCG leaf', path);
    }
    const leaf = asLeaf(node);
    if (resolvedType === 'typography' && typeof leaf.$value === 'object' && leaf.$value !== null) {
      decomposeTypographyLeaf(collectionId, pathSegments, leaf, resolvedType, tokens, path);
      return;
    }
    emitLeafToken(collectionId, pathSegments, leaf, resolvedType, tokens, path);
    return;
  }
  walkGroup(collectionId, node as TokensV1WC3DTCGGroup, pathSegments, resolvedType, tokens);
}

function decomposeTypographyLeaf(
  collectionId: CollectionId,
  pathSegments: string[],
  node: DtcgTokenLeafShape,
  dtcgType: DtcgTokenType,
  tokens: Token[],
  path: string,
): void {
  const composite = node.$value as Record<string, unknown>;
  const slotPrefix = pathSegments.join('/');
  const figmint = extractFigmintExtensions(node.$extensions);
  const vendorExtensions = splitVendorExtensions(node.$extensions);

  const properties: { suffix: string; type: DtcgTokenType; value: unknown }[] = [];
  if ('fontFamily' in composite) {
    properties.push({ suffix: 'font-family', type: 'fontFamily', value: composite.fontFamily });
  }
  if ('fontSize' in composite) {
    properties.push({ suffix: 'font-size', type: 'dimension', value: composite.fontSize });
  }
  if ('fontWeight' in composite) {
    properties.push({ suffix: 'font-weight', type: 'fontWeight', value: composite.fontWeight });
  }
  if ('lineHeight' in composite) {
    properties.push({ suffix: 'line-height', type: 'dimension', value: composite.lineHeight });
  }

  if (properties.length === 0) {
    throw new AdapterFormatError('Typography composite missing decomposable properties', path);
  }

  for (const property of properties) {
    const name = `${slotPrefix}/${property.suffix}`;
    rejectDotInName(name, `${path}/${property.suffix}`);
    const tokenType = mapDtcgTypeToTokenType(property.type);
    const defaultMode = defaultModeForCollection(collectionId);
    const valuesByMode: Record<string, ParsedModeValue> = {
      [defaultMode]: parseLeafValue(
        property.value,
        property.type,
        collectionId,
        `${path}/${property.suffix}`,
      ),
    };
    if (figmint.modes) {
      for (const [modeKey, modeValue] of Object.entries(figmint.modes)) {
        if (
          typeof modeValue === 'object' &&
          modeValue !== null &&
          property.suffix.replace('-', '') in modeValue
        ) {
          const key = property.suffix.includes('size')
            ? 'fontSize'
            : property.suffix.includes('family')
              ? 'fontFamily'
              : property.suffix.includes('weight')
                ? 'fontWeight'
                : 'lineHeight';
          if (key in (modeValue as Record<string, unknown>)) {
            valuesByMode[modeKey] = parseLeafValue(
              (modeValue as Record<string, unknown>)[key],
              property.type,
              collectionId,
              `${path}/${modeKey}`,
            );
          }
        }
      }
    }

    const tokenBase = {
      collection: collectionId,
      name,
      description: node.$description,
      codeSyntax: figmint.codeSyntax,
      extensions: vendorExtensions,
    };

    if (tokenType === 'COLOR') {
      pushToken(tokens, {
        ...tokenBase,
        type: 'COLOR',
        valuesByMode: valuesByMode as Record<string, ColorValue | TokenAliasRef>,
      });
    } else if (tokenType === 'FLOAT') {
      pushToken(tokens, {
        ...tokenBase,
        type: 'FLOAT',
        valuesByMode: valuesByMode as Record<string, number | TokenAliasRef>,
      });
    } else {
      pushToken(tokens, {
        ...tokenBase,
        type: 'STRING',
        valuesByMode: valuesByMode as Record<string, string | TokenAliasRef>,
      });
    }
  }

  void dtcgType;
}

function emitLeafToken(
  collectionId: CollectionId,
  pathSegments: string[],
  node: DtcgTokenLeafShape,
  dtcgType: DtcgTokenType,
  tokens: Token[],
  path: string,
): void {
  const name = pathSegments.join('/');
  rejectDotInName(name, path);
  const tokenType = mapDtcgTypeToTokenType(dtcgType);
  const figmint = extractFigmintExtensions(node.$extensions);
  const vendorExtensions = splitVendorExtensions(node.$extensions);
  const defaultMode = defaultModeForCollection(collectionId);
  const valuesByMode: Record<string, ParsedModeValue> = {};

  if (figmint.modes && Object.keys(figmint.modes).length > 0) {
    for (const [modeKey, modeValue] of Object.entries(figmint.modes)) {
      valuesByMode[modeKey] = parseLeafValue(
        modeValue,
        dtcgType,
        collectionId,
        `${path}/${modeKey}`,
      );
    }
  } else if (collectionId === 'theme' || collectionId === 'effects') {
    throw new AdapterFormatError(
      `Theme/Effects tokens require $extensions.figmint.modes: ${path}`,
      path,
    );
  } else {
    valuesByMode[defaultMode] = parseLeafValue(node.$value, dtcgType, collectionId, path);
  }

  if (tokenType === 'COLOR') {
    pushToken(tokens, {
      collection: collectionId,
      name,
      type: 'COLOR',
      valuesByMode: valuesByMode as Record<string, ColorValue | TokenAliasRef>,
      description: node.$description,
      deprecated: node.$deprecated,
      codeSyntax: figmint.codeSyntax,
      extensions: vendorExtensions,
    });
    return;
  }
  if (tokenType === 'FLOAT') {
    pushToken(tokens, {
      collection: collectionId,
      name,
      type: 'FLOAT',
      valuesByMode: valuesByMode as Record<string, number | TokenAliasRef>,
      description: node.$description,
      deprecated: node.$deprecated,
      codeSyntax: figmint.codeSyntax,
      extensions: vendorExtensions,
    });
    return;
  }
  if (tokenType === 'STRING') {
    pushToken(tokens, {
      collection: collectionId,
      name,
      type: 'STRING',
      valuesByMode: valuesByMode as Record<string, string | TokenAliasRef>,
      description: node.$description,
      deprecated: node.$deprecated,
      codeSyntax: figmint.codeSyntax,
      extensions: vendorExtensions,
    });
    return;
  }
  pushToken(tokens, {
    collection: collectionId,
    name,
    type: 'BOOLEAN',
    valuesByMode: valuesByMode as Record<string, boolean | TokenAliasRef>,
    description: node.$description,
    deprecated: node.$deprecated,
    codeSyntax: figmint.codeSyntax,
    extensions: vendorExtensions,
  });
}

export function adaptDTCG(input: TokensV1WC3DTCG): TokensV1 {
  const normalized = normalizeDtcgTopLevel(input);
  const tokens: Token[] = [];

  for (const [key, value] of Object.entries(normalized)) {
    if (key === '$schema' || value === undefined || typeof value === 'string') {
      continue;
    }
    if (!COLLECTION_ID_SET.has(key as CollectionId)) {
      throw new AdapterFormatError(
        `Unknown top-level DTCG group: ${key}. Expected collection ids (primitives, theme, typography, layout, effects) or semantic groups like color/spacing at the root (auto-wrapped under primitives).`,
        key,
      );
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new AdapterFormatError(`Invalid DTCG group node: ${key}`, key);
    }
    walkGroup(key as CollectionId, value as TokensV1WC3DTCGGroup, [], undefined, tokens);
  }

  return {
    v: 1,
    kind: 'tokens',
    collections: buildCollections(),
    tokens,
  };
}
