/// <reference types="@figma/plugin-typings" />

import { describe, expect, it } from 'vitest';

import { collectionNameToDisplay } from '@/core/handoff/tokens';

describe('collectionNameToDisplay', () => {
  it('maps collection id keys to DISPLAY_NAME values', () => {
    expect(collectionNameToDisplay('primitives')).toBe('Primitives');
    expect(collectionNameToDisplay('theme')).toBe('Theme');
    expect(collectionNameToDisplay('typography')).toBe('Typography');
    expect(collectionNameToDisplay('layout')).toBe('Layout');
    expect(collectionNameToDisplay('effects')).toBe('Effects');
  });

  it('passes through canonical display names', () => {
    expect(collectionNameToDisplay('Theme')).toBe('Theme');
    expect(collectionNameToDisplay('Layout')).toBe('Layout');
  });

  it('PascalCases unknown collection names from first segment', () => {
    expect(collectionNameToDisplay('custom/tokens')).toBe('Custom');
  });
});
