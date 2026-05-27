import { describe, expect, it } from 'vitest';

import foundationsMinimal from '@/core/canvas/__fixtures__/foundations-minimal.v1.json';
import primitives100 from '@/core/canvas/__fixtures__/primitives-100.v1.json';
import {
  projectColorRampsFromTokens,
  projectPrimitiveFloatRows,
  projectPrimitiveStringRows,
} from '@/core/canvas/projectRows/primitivesRows';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

describe('primitivesRows', () => {
  it('projects typeface string rows from foundations-minimal', () => {
    const rows = projectPrimitiveStringRows(foundationsMinimal as unknown as TokensV1);
    expect(rows.length).toBe(1);
    expect(rows[0].tokenPath).toBe('typeface/display');
    expect(rows[0].resolvedValue).toBe('Inter');
  });

  it('projects 100 color ramp stops across 5 ramps', () => {
    const ramps = projectColorRampsFromTokens(primitives100 as TokensV1);
    const keys = Object.keys(ramps);
    expect(keys.length).toBe(5);
    let total = 0;
    for (const key of keys) {
      expect(ramps[key].length).toBe(20);
      total += ramps[key].length;
      expect(ramps[key][0].resolvedHex).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(total).toBe(100);
  });

  it('returns empty float buckets when no primitive floats present', () => {
    const floats = projectPrimitiveFloatRows(foundationsMinimal as unknown as TokensV1);
    expect(floats.space).toEqual([]);
    expect(floats.radius).toEqual([]);
    expect(floats.elevation).toEqual([]);
    expect(floats.fontWeight).toEqual([]);
  });
});
