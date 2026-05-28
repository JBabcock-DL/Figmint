import { describe, expect, it } from 'vitest';

import { parseVariableDriftId, toVariableDriftId, toVariableKey } from '@/core/drift/variableKeys';

describe('variableKeys', () => {
  it('round-trips collection and variable name', () => {
    const id = toVariableDriftId('Primitives', 'color/primary');
    expect(id).toBe('var/Primitives/color/primary');
    expect(parseVariableDriftId(id)).toEqual({
      collectionName: 'Primitives',
      variableName: 'color/primary',
    });
  });

  it('strips leading slash from variable name in key', () => {
    expect(toVariableKey('Theme', '/background/default')).toBe('Theme/background/default');
  });

  it('rejects dot-only legacy keys without var prefix', () => {
    expect(parseVariableDriftId('primitives.color.primary')).toBeNull();
  });
});
