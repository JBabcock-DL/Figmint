import { describe, expect, it } from 'vitest';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import layoutEffectsFixture from '@/core/canvas/__fixtures__/layout-effects.v1.json';
import { loadLayoutEffectsReference } from '@/core/canvas/data/loadCanvasData';
import { resolveEffectsRows, TIER_NAMES } from '@/core/canvas/resolveEffectsRows';
import { getColumnSpec, validateColumnWidths } from '@/core/canvas/helpers/columnSpec';

describe('resolveEffectsRows', () => {
  const tokens = layoutEffectsFixture as unknown as TokensV1;
  const reference = loadLayoutEffectsReference();

  it('returns 5 shadow tiers + 1 color row for foundations fixture', () => {
    const result = resolveEffectsRows(tokens, []);
    expect(result.shadows.length).toBe(5);
    expect(result.shadows.length).toBe(reference.effects.blurs.length);
    expect(result.shadowColor).not.toBeNull();
    expect(result.shadowColor?.tokenPath).toBe('shadow/color');
  });

  it('assigns tiers in sorted name order', () => {
    const result = resolveEffectsRows(tokens, []);
    for (let i = 0; i < result.shadows.length; i++) {
      expect(result.shadows[i].tier).toBe(TIER_NAMES[i]);
    }
  });

  it('resolves blur px from elevation aliases', () => {
    const result = resolveEffectsRows(tokens, []);
    const md = result.shadows.find(function (row) {
      return row.tokenPath === 'shadow/md/blur';
    });
    expect(md?.blurPx).toBe(4);
    expect(md?.aliasPath).toBe('elevation/200');
  });

  it('resolves shadow/color rgba per mode', () => {
    const result = resolveEffectsRows(tokens, []);
    expect(result.shadowColor?.lightRgba).toBe('rgba(0,0,0,0.1)');
    expect(result.shadowColor?.darkRgba).toBe('rgba(0,0,0,0.3)');
  });

  it('effects table column specs sum to 1640', () => {
    validateColumnWidths(getColumnSpec('effects/shadows'));
    validateColumnWidths(getColumnSpec('effects/color'));
  });
});
