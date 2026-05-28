import { beforeEach, describe, expect, it, vi } from 'vitest';

import foundationsMinimal from '@/core/canvas/__fixtures__/foundations-minimal.v1.json';
import { publishTypographyStyles } from '@/core/canvas/publishTypographyStyles';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

describe('publishTypographyStyles', () => {
  beforeEach(() => {
    const styles: Array<{
      id: string;
      name: string;
      fontName: FontName;
      fontSize: number;
      lineHeight: LineHeight;
      textDecoration: TextDecoration;
      setBoundVariable: ReturnType<typeof vi.fn>;
    }> = [];
    let nextId = 1;

    const typographyModeId = 'mode-100';
    const typographyCollectionId = 'coll-typography';
    const primitivesCollectionId = 'coll-primitives';

    const variables: Variable[] = [
      {
        id: 'var-display-lg-size',
        name: 'Display/LG/font-size',
        variableCollectionId: typographyCollectionId,
        resolvedType: 'FLOAT',
        valuesByMode: { [typographyModeId]: 57 },
      } as Variable,
      {
        id: 'var-display-lg-weight',
        name: 'Display/LG/font-weight',
        variableCollectionId: typographyCollectionId,
        resolvedType: 'FLOAT',
        valuesByMode: { [typographyModeId]: 400 },
      } as Variable,
      {
        id: 'var-display-lg-line',
        name: 'Display/LG/line-height',
        variableCollectionId: typographyCollectionId,
        resolvedType: 'FLOAT',
        valuesByMode: { [typographyModeId]: 64 },
      } as Variable,
      {
        id: 'var-display-lg-family',
        name: 'Display/LG/font-family',
        variableCollectionId: typographyCollectionId,
        resolvedType: 'STRING',
        valuesByMode: {
          [typographyModeId]: { type: 'VARIABLE_ALIAS', id: 'var-typeface-display' },
        },
      } as Variable,
      {
        id: 'var-typeface-display',
        name: 'typeface/display',
        variableCollectionId: primitivesCollectionId,
        resolvedType: 'STRING',
        valuesByMode: { 'mode-default': 'Inter' },
      } as Variable,
    ];

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
          lineHeight: { unit: 'AUTO' } as LineHeight,
          textDecoration: 'NONE' as TextDecoration,
          setBoundVariable: vi.fn(),
        };
        styles.push(style);
        return style;
      }),
      loadFontAsync: vi.fn(function () {
        return Promise.resolve(undefined);
      }),
      variables: {
        getLocalVariablesAsync: vi.fn(function () {
          return Promise.resolve(variables);
        }),
        getLocalVariableCollectionsAsync: vi.fn(function () {
          return Promise.resolve([
            {
              id: typographyCollectionId,
              name: 'Typography',
              modes: [{ modeId: typographyModeId, name: '100' }],
            },
            {
              id: primitivesCollectionId,
              name: 'Primitives',
              modes: [{ modeId: 'mode-default', name: 'Default' }],
            },
          ]);
        }),
      },
    };
  });

  it('creates doc + slot styles and binds typography variables', async () => {
    const result = await publishTypographyStyles(foundationsMinimal as unknown as TokensV1);

    expect(result.docStyles).toBe(4);
    expect(result.slotStyles).toBe(27);
    expect(result.missing).toEqual([]);
    expect(result.boundStyles).toBe(31);

    const globalRecord = globalThis as Record<string, unknown>;
    const figmaMock = globalRecord.figma as {
      getLocalTextStylesAsync: ReturnType<typeof vi.fn>;
    };
    const allStyles = (await figmaMock.getLocalTextStylesAsync()) as Array<{
      name: string;
      setBoundVariable: ReturnType<typeof vi.fn>;
      fontSize: number;
    }>;
    const displayStyle = allStyles.find(function (style) {
      return style.name === 'Display/LG';
    });
    expect(displayStyle).toBeDefined();
    expect(displayStyle!.setBoundVariable).toHaveBeenCalled();
    expect(displayStyle!.fontSize).toBe(57);
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
