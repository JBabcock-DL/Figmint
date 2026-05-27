import { describe, expect, it } from 'vitest';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import layoutEffectsFixture from '@/core/canvas/__fixtures__/layout-effects.v1.json';
import { loadLayoutEffectsReference } from '@/core/canvas/data/loadCanvasData';
import { layoutSpacingColumnSpec } from '@/core/canvas/layout';
import { resolveLayoutRows } from '@/core/canvas/resolveLayoutRows';
import { getColumnSpec, validateColumnWidths } from '@/core/canvas/helpers/columnSpec';

describe('resolveLayoutRows', () => {
  const tokens = layoutEffectsFixture as unknown as TokensV1;
  const reference = loadLayoutEffectsReference();

  it('matches layout-effects.json spacing + radius counts', () => {
    const groups = resolveLayoutRows(tokens, []);
    expect(groups.space.length).toBe(reference.layout.spacing.length);
    expect(groups.radius.length).toBe(reference.layout.radius.length);
  });

  it('sorts spacing rows by resolved px ascending', () => {
    const groups = resolveLayoutRows(tokens, []);
    const spaceRows = groups.space;
    for (let i = 1; i < spaceRows.length; i++) {
      expect(spaceRows[i].resolvedPx).toBeGreaterThanOrEqual(spaceRows[i - 1].resolvedPx);
    }
  });

  it('maps radius/full to pill display ∞', () => {
    const groups = resolveLayoutRows(tokens, []);
    const full = groups.radius.find(function (row) {
      return row.tokenPath === 'radius/full';
    });
    expect(full).toBeDefined();
    expect(full?.displayValue).toBe('∞');
    expect(full?.resolvedPx).toBe(9999);
    expect(full?.previewKind).toBe('square');
  });

  it('exposes alias paths from token aliases', () => {
    const groups = resolveLayoutRows(tokens, []);
    const md = groups.space.find(function (row) {
      return row.tokenPath === 'space/md';
    });
    expect(md?.aliasPath).toBe('Space/300');
  });

  it('layout/spacing column spec sums to 1640', () => {
    const columns = layoutSpacingColumnSpec();
    validateColumnWidths(columns);
    expect(getColumnSpec('layout/spacing')).toEqual(columns);
  });
});
