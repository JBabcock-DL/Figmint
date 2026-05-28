import { describe, expect, it } from 'vitest';

import { adaptDTCG } from '@/io/sources/adapters/dtcg';
import { normalizeDtcgTopLevel } from '@/io/sources/adapters/normalizeDtcgTopLevel';
import type { TokensV1WC3DTCG } from '@detroitlabs/fighub-contracts';

import { loadAdapterFixture } from './helpers';

describe('normalizeDtcgTopLevel', () => {
  it('wraps generic top-level color group under primitives', () => {
    const generic: TokensV1WC3DTCG = {
      color: {
        primary: {
          '500': {
            $value: '#6366f1',
            $type: 'color',
          },
        },
      },
    };
    const normalized = normalizeDtcgTopLevel(generic);
    expect(normalized.primitives).toBeDefined();
    expect(normalized.color).toBeUndefined();
    const result = adaptDTCG(generic);
    const token = result.tokens.find(
      (entry) => entry.collection === 'primitives' && entry.name === 'color/primary/500',
    );
    expect(token?.type).toBe('COLOR');
  });

  it('folds orphan groups into existing primitives while preserving theme', () => {
    const mixed: TokensV1WC3DTCG = {
      color: {
        neutral: {
          '100': {
            $value: '#f5f5f5',
            $type: 'color',
          },
        },
      },
      theme: {
        color: {
          surface: {
            default: {
              $type: 'color',
              $value: '#ffffff',
              $extensions: {
                fighub: {
                  modes: {
                    Light: '#ffffff',
                    Dark: '#0f172a',
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = adaptDTCG(mixed);
    expect(
      result.tokens.some(
        (entry) => entry.collection === 'primitives' && entry.name === 'color/neutral/100',
      ),
    ).toBe(true);
    expect(
      result.tokens.some(
        (entry) => entry.collection === 'theme' && entry.name === 'color/surface/default',
      ),
    ).toBe(true);
  });
});

describe('adaptDTCG', () => {
  const input = loadAdapterFixture('dtcg-foundations-min.json') as TokensV1WC3DTCG;

  it('produces canonical envelope', () => {
    const result = adaptDTCG(input);
    expect(result.v).toBe(1);
    expect(result.kind).toBe('tokens');
  });

  it('emits at least 20 tokens without dots in names', () => {
    const result = adaptDTCG(input);
    expect(result.tokens.length).toBeGreaterThanOrEqual(20);
    for (const token of result.tokens) {
      expect(token.name.includes('.')).toBe(false);
    }
  });

  it('parses cross-collection alias to structured aliasOf', () => {
    const result = adaptDTCG(input);
    const surface = result.tokens.find(
      (token) => token.collection === 'theme' && token.name === 'color/surface/default',
    );
    expect(surface?.valuesByMode.Light).toEqual({
      aliasOf: { collection: 'primitives', name: 'color/neutral/100' },
    });
  });

  it('folds fighub modes extension into valuesByMode', () => {
    const result = adaptDTCG(input);
    const primary = result.tokens.find(
      (token) => token.collection === 'theme' && token.name === 'color/primary/default',
    );
    const light = primary?.valuesByMode.Light;
    expect(light && typeof light === 'object' && 'r' in light ? light.r : null).toBeCloseTo(
      0.388,
      2,
    );
    expect(light && typeof light === 'object' && 'g' in light ? light.g : null).toBeCloseTo(0.4, 2);
    const dark = primary?.valuesByMode.Dark;
    expect(dark && typeof dark === 'object' && 'b' in dark ? dark.b : null).toBeCloseTo(0.973, 2);
  });

  it('types inherited group leaves correctly', () => {
    const result = adaptDTCG(input);
    const space = result.tokens.find(
      (token) => token.collection === 'primitives' && token.name === 'Space/100',
    );
    expect(space?.type).toBe('FLOAT');
    expect(space?.valuesByMode.Default).toBe(4);
  });
});
