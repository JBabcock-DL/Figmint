/**
 * Round-trip tests use inline serializers — production exporters ship in WO-019.
 */
import { describe, expect, it } from 'vitest';

import { adapt } from '@/io/sources/adapters';
import type {
  CollectionId,
  Token,
  TokenAliasRef,
  TokensV1,
  TokensV1Legacy,
  TokensV1WC3DTCG,
} from '@detroitlabs/figmint-contracts';

import { loadAdapterFixture, normalizeJson } from './helpers';

function isAlias(value: unknown): value is TokenAliasRef {
  return typeof value === 'object' && value !== null && 'aliasOf' in value;
}

function serializeAlias(alias: TokenAliasRef): string {
  const name = alias.aliasOf.name.replace(/\//g, '.');
  return `{${alias.aliasOf.collection}.${name}}`;
}

function serializeModeValue(
  value: unknown,
  tokenType?: Token['type'],
  tokenName?: string,
): string | number | boolean {
  if (isAlias(value)) {
    return serializeAlias(value);
  }
  if (typeof value === 'object' && value !== null && 'r' in value) {
    const color = value as { r: number; g: number; b: number; a: number };
    if (color.a === 1) {
      const toHex = (channel: number) =>
        Math.round(channel * 255)
          .toString(16)
          .padStart(2, '0');
      return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
    }
    return `rgba(${String(Math.round(color.r * 255))},${String(Math.round(color.g * 255))},${String(Math.round(color.b * 255))},${String(color.a)})`;
  }
  if (
    typeof value === 'number' &&
    tokenType === 'FLOAT' &&
    tokenName &&
    !tokenName.includes('font-weight')
  ) {
    return `${String(value)}px`;
  }
  return value as string | number | boolean;
}

function inferDtcgType(token: Token): string {
  if (token.type === 'COLOR') {
    return 'color';
  }
  if (token.type === 'STRING') {
    return 'fontFamily';
  }
  if (token.type === 'FLOAT') {
    return token.name.includes('font-weight') ? 'fontWeight' : 'dimension';
  }
  return 'number';
}

function serializeDTCG(canonical: TokensV1): TokensV1WC3DTCG {
  const output: Record<string, unknown> = {};

  for (const token of canonical.tokens) {
    const segments = token.name.split('/');
    const collectionRoot = (output[token.collection] ??= {}) as Record<string, unknown>;
    let cursor = collectionRoot;

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      const next = (cursor[segment] ??= {}) as Record<string, unknown>;
      cursor = next;
    }

    const leafKey = segments[segments.length - 1];
    const modes = Object.keys(token.valuesByMode);
    const multiMode =
      modes.length > 1 || token.collection === 'theme' || token.collection === 'effects';
    const defaultMode = modes.includes('Default')
      ? 'Default'
      : modes.includes('Light')
        ? 'Light'
        : modes[0];

    const leaf: Record<string, unknown> = {
      $type: inferDtcgType(token),
    };

    if (multiMode) {
      const figmintModes: Record<string, unknown> = {};
      for (const [mode, value] of Object.entries(token.valuesByMode)) {
        figmintModes[mode] = serializeModeValue(value, token.type, token.name);
      }
      leaf.$value = serializeModeValue(token.valuesByMode[defaultMode], token.type, token.name);
      leaf.$extensions = {
        figmint: {
          modes: figmintModes,
          ...(token.codeSyntax ? { codeSyntax: token.codeSyntax } : {}),
        },
        ...(token.extensions ?? {}),
      };
    } else {
      leaf.$value = serializeModeValue(token.valuesByMode[defaultMode], token.type, token.name);
      if (token.codeSyntax || token.extensions) {
        leaf.$extensions = {
          ...(token.codeSyntax ? { figmint: { codeSyntax: token.codeSyntax } } : {}),
          ...(token.extensions ?? {}),
        };
      }
    }

    if (token.description) {
      leaf.$description = token.description;
    }
    if (token.deprecated !== undefined) {
      leaf.$deprecated = token.deprecated;
    }

    cursor[leafKey] = leaf;
  }

  return output as TokensV1WC3DTCG;
}

const LEGACY_NAMES: Record<CollectionId, TokensV1Legacy['collections'][number]['name']> = {
  primitives: 'Primitives',
  theme: 'Theme',
  typography: 'Typography',
  layout: 'Layout',
  effects: 'Effects',
};

function serializeLegacy(canonical: TokensV1): TokensV1Legacy {
  const grouped = new Map<CollectionId, Token[]>();
  for (const token of canonical.tokens) {
    const list = grouped.get(token.collection) ?? [];
    list.push(token);
    grouped.set(token.collection, list);
  }

  const collections = (['primitives', 'theme', 'typography', 'layout', 'effects'] as const)
    .filter((id) => grouped.has(id))
    .map((id) => {
      const tokensForCollection = grouped.get(id) ?? [];
      const usedModes = new Set<string>();
      for (const token of tokensForCollection) {
        for (const mode of Object.keys(token.valuesByMode)) {
          usedModes.add(mode);
        }
      }
      const meta = canonical.collections.find((collection) => collection.id === id);
      const modes =
        usedModes.size > 0
          ? [...usedModes].sort(
              (a, b) => Number.parseFloat(a) - Number.parseFloat(b) || a.localeCompare(b),
            )
          : [...(meta?.modes ?? ['Default'])];
      return {
        name: LEGACY_NAMES[id],
        modes,
        variables: tokensForCollection.map((token) => ({
          name: token.name,
          type: token.type,
          valuesByMode: Object.fromEntries(
            Object.entries(token.valuesByMode).map(([mode, value]) => {
              if (isAlias(value)) {
                return [mode, value.aliasOf.name];
              }
              if (typeof value === 'object' && value !== null && 'r' in value) {
                const color = value as { r: number; g: number; b: number; a: number };
                if (color.a === 1) {
                  return [mode, serializeModeValue(value, token.type, token.name)];
                }
                return [mode, value];
              }
              return [mode, value];
            }),
          ),
          ...(token.codeSyntax ? { codeSyntax: token.codeSyntax } : {}),
          ...(token.description ? { description: token.description } : {}),
        })),
      };
    });

  return { collections };
}

describe('roundtrip serializers (WO-019 stubs)', () => {
  const dtcgFixtures = ['roundtrip-dtcg-a.json', 'roundtrip-dtcg-b.json', 'roundtrip-dtcg-c.json'];
  const legacyFixtures = [
    'roundtrip-legacy-a.json',
    'roundtrip-legacy-b.json',
    'roundtrip-legacy-c.json',
  ];

  for (const fixtureName of dtcgFixtures) {
    it(`round-trips DTCG fixture ${fixtureName}`, () => {
      const input = loadAdapterFixture(fixtureName) as TokensV1WC3DTCG;
      const canonical = adapt(input);
      expect('kind' in canonical && canonical.kind === 'tokens').toBe(true);
      const serialized = serializeDTCG(canonical as TokensV1);
      expect(normalizeJson(serialized)).toEqual(normalizeJson(input));
    });
  }

  for (const fixtureName of legacyFixtures) {
    it(`round-trips legacy fixture ${fixtureName}`, () => {
      const input = loadAdapterFixture(fixtureName) as TokensV1Legacy;
      const canonical = adapt(input);
      expect('kind' in canonical && canonical.kind === 'tokens').toBe(true);
      const serialized = serializeLegacy(canonical as TokensV1);
      expect(normalizeJson(serialized)).toEqual(normalizeJson(input));
    });
  }
});
