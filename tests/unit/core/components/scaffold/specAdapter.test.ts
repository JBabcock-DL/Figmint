import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { HEX_FALLBACK_PALETTE, createScaffoldContext, ensureScaffoldFonts } from '@/core/components/scaffold/context';
import {
  inferArchetype,
  projectBuildContext,
  resolveArchetypeRoute,
} from '@/core/components/scaffold/specAdapter';

import chipMinimal from '../../../../fixtures/component-spec/chip-button-minimal.v1.json';
import composedSpec from '../../../../fixtures/component-spec/composed-button-group.v1.json';

import { getLoadFontAsyncCalls, installMockFigmaScaffold } from './__mocks__/figmaScaffold';

function loadFixture<T>(fileName: string): T {
  const filePath = resolve(process.cwd(), 'tests/fixtures/component-spec', fileName);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

describe('specAdapter', () => {
  it('routes composed specs to composed archetype', () => {
    const spec = composedSpec as ComponentSpecV1;
    expect(resolveArchetypeRoute(spec)).toBe('composed');
  });

  it('falls back to chip when archetype is unknown', () => {
    const spec = {
      v: 1,
      kind: 'component-spec',
      name: 'Mystery',
      framework: 'react',
      variantMatrix: { variant: ['a'] },
      props: [],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: '8',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    } as ComponentSpecV1;
    expect(inferArchetype(spec)).toBe('chip');
  });

  it('builds non-empty style map for chip-button-minimal', () => {
    const spec = chipMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    expect(Object.keys(ctx.styleByVariantKey).length).toBeGreaterThan(0);
    expect(ctx.styleByVariantKey.default).toBeDefined();
  });

  it('maps padding tokens to numeric spacing', () => {
    const spec = chipMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    expect(ctx.spacing.padH).toBe(16);
    expect(ctx.spacing.gap).toBe(8);
  });

  it('loads fixtures from disk as ComponentSpecV1', () => {
    const spec = loadFixture<ComponentSpecV1>('field-minimal.v1.json');
    expect(spec.archetype).toBe('field');
    expect(spec.v).toBe(1);
  });
});

describe('context', () => {
  it('exposes locked hex fallback palette', () => {
    expect(HEX_FALLBACK_PALETTE.primary.r).toBeCloseTo(0.404, 2);
    expect(HEX_FALLBACK_PALETTE.onPrimary.g).toBeCloseTo(1, 2);
    expect(HEX_FALLBACK_PALETTE.surface.b).toBeCloseTo(0.996, 2);
    expect(HEX_FALLBACK_PALETTE.outline.r).toBeCloseTo(0.475, 2);
  });

  it('invokes figma.loadFontAsync before text assignment paths', async () => {
    installMockFigmaScaffold();
    const spec = chipMinimal as ComponentSpecV1;
    const ctx = createScaffoldContext(spec, { variant: 'default' }, 'variant=default');
    await ensureScaffoldFonts(ctx);
    const calls = getLoadFontAsyncCalls();
    expect(calls).toEqual([{ family: 'Inter', style: 'Medium' }]);
  });
});
