import { describe, expect, it } from 'vitest';

import {
  DOC_STYLE_TOKEN_PREFIX,
  resolveSlotBindingTarget,
  resolveVariableValueAtTypography100,
  type TypographyBindingContext,
} from '@/core/canvas/typographyStyleBinding';

describe('typographyStyleBinding', () => {
  it('maps doc styles to typography token prefixes', () => {
    expect(DOC_STYLE_TOKEN_PREFIX['_Doc/Section']).toBe('Headline/LG');
    expect(DOC_STYLE_TOKEN_PREFIX['_Doc/Code']).toBe('Label/SM');
  });

  it('maps base slot names to four property paths', () => {
    expect(resolveSlotBindingTarget('Display/LG')).toEqual({
      tokenPrefix: 'Display/LG',
      weightPath: 'Display/LG/font-weight',
      variant: null,
    });
  });

  it('maps body emphasis to font/weight/medium', () => {
    expect(resolveSlotBindingTarget('Body/LG/emphasis')).toEqual({
      tokenPrefix: 'Body/LG',
      weightPath: 'font/weight/medium',
      variant: 'emphasis',
    });
  });

  it('maps body regular variants to base weight path', () => {
    expect(resolveSlotBindingTarget('Body/MD/italic')).toEqual({
      tokenPrefix: 'Body/MD',
      weightPath: 'Body/MD/font-weight',
      variant: 'italic',
    });
  });

  it('follows typography → primitive alias when resolving mode 100', () => {
    const typographyModeId = 'mode-100';
    const typographyCollectionId = 'coll-typography';
    const primitivesCollectionId = 'coll-primitives';
    const typefaceVar = {
      id: 'var-typeface',
      name: 'typeface/display',
      variableCollectionId: primitivesCollectionId,
      valuesByMode: { 'mode-default': 'Inter' },
    } as Variable;
    const familyVar = {
      id: 'var-family',
      name: 'Display/LG/font-family',
      variableCollectionId: typographyCollectionId,
      valuesByMode: {
        [typographyModeId]: { type: 'VARIABLE_ALIAS', id: 'var-typeface' },
      },
    } as Variable;
    const ctx: TypographyBindingContext = {
      variableMap: {
        'Display/LG/font-family': familyVar,
        'typeface/display': typefaceVar,
      },
      variableById: {
        'var-family': familyVar,
        'var-typeface': typefaceVar,
      },
      collectionsById: {
        [typographyCollectionId]: {
          id: typographyCollectionId,
          name: 'Typography',
          modes: [{ modeId: typographyModeId, name: '100' }],
        } as VariableCollection,
        [primitivesCollectionId]: {
          id: primitivesCollectionId,
          name: 'Primitives',
          modes: [{ modeId: 'mode-default', name: 'Default' }],
        } as VariableCollection,
      },
      typographyModeId: typographyModeId,
    };

    expect(resolveVariableValueAtTypography100(familyVar, ctx)).toBe('Inter');
  });
});
