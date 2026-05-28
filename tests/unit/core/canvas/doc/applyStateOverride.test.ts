/// <reference types="@figma/plugin-typings" />

import { describe, expect, it } from 'vitest';

import { applyButtonStateOverride } from '@/core/canvas/doc/applyStateOverride';
import { STATE_OPACITY } from '@/core/canvas/doc/constants';

function createTestInstance(initialOpacity = 0): InstanceNode {
  return { opacity: initialOpacity } as InstanceNode;
}

describe('applyButtonStateOverride', () => {
  it('sets opacity 1 for default (STATE_OPACITY fallthrough)', () => {
    const instance = createTestInstance(0.5);
    applyButtonStateOverride(instance, 'default');
    expect(instance.opacity).toBe(1);
  });

  it('sets hover opacity per §13.1.a', () => {
    const instance = createTestInstance();
    applyButtonStateOverride(instance, 'hover');
    expect(instance.opacity).toBe(STATE_OPACITY.hover);
    expect(instance.opacity).toBe(0.92);
  });

  it('sets pressed opacity per §13.1.a', () => {
    const instance = createTestInstance();
    applyButtonStateOverride(instance, 'pressed');
    expect(instance.opacity).toBe(STATE_OPACITY.pressed);
    expect(instance.opacity).toBe(0.85);
  });

  it('sets disabled opacity per §13.1.a', () => {
    const instance = createTestInstance();
    applyButtonStateOverride(instance, 'disabled');
    expect(instance.opacity).toBe(STATE_OPACITY.disabled);
    expect(instance.opacity).toBe(0.5);
  });
});
