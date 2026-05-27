import { beforeEach, describe, expect, it, vi } from 'vitest';

import foundationsMinimal from '@/core/canvas/__fixtures__/foundations-minimal.v1.json';
import { publishTypographyStyles } from '@/core/canvas/publishTypographyStyles';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

describe('publishTypographyStyles', () => {
  beforeEach(() => {
    const styles: { id: string; name: string }[] = [];
    let nextId = 1;

    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      getLocalTextStylesAsync: vi.fn(function () {
        return Promise.resolve(styles.slice());
      }),
      createTextStyle: vi.fn(function () {
        const style = {
          id: 'style-' + String(nextId++),
          name: '',
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 14,
        };
        styles.push(style);
        return style;
      }),
      loadFontAsync: vi.fn(function () {
        return Promise.resolve(undefined);
      }),
    };
  });

  it('creates doc + slot styles and reports counts', async () => {
    const result = await publishTypographyStyles(foundationsMinimal as unknown as TokensV1);

    expect(result.docStyles).toBe(4);
    expect(result.slotStyles).toBe(27);
    expect(result.missing).toEqual([]);
  });

  it('populates missing when styles fail to persist', async () => {
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaMock = globalRecord.figma as {
      getLocalTextStylesAsync: ReturnType<typeof vi.fn>;
    };
    figmaMock.getLocalTextStylesAsync = vi.fn(function () {
      return Promise.resolve([{ id: '1', name: '_Doc/Section' }]);
    });

    const result = await publishTypographyStyles(foundationsMinimal as unknown as TokensV1);

    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing).toContain('Display/LG');
  });
});
