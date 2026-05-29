import { describe, expect, it, vi } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { applyProperties } from '@/core/components/scaffold/applyProperties';

import chipFixture from '@/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json';

import { createMockComponent, createMockComponentSet } from './__mocks__/figmaScaffold';
import { asComponentSetNode } from './__mocks__/figmaScaffold';

describe('applyProperties', () => {
  it('returns ok:true for empty spec on mock set', () => {
    const set = createMockComponentSet();
    Object.defineProperty(set, 'remote', { value: false });
    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Empty',
      framework: 'react',
      variantMatrix: { variant: ['default'] },
      props: [],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: 'space/md',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };
    const variant = createMockComponent();
    attachAddProp(variant);
    set.appendChild(variant as unknown as SceneNode);
    Object.defineProperty(set, 'componentPropertyDefinitions', {
      value: { variant: { type: 'VARIANT', variantOptions: ['default'] } },
    });

    const result = applyProperties(spec, asComponentSetNode(set));
    expect(result.ok).toBe(true);
    expect(Object.keys(result.propKeys)).toHaveLength(0);
  });

  it('creates boolean loading with suffixed key', () => {
    const set = createMockComponentSet();
    Object.defineProperty(set, 'remote', { value: false });
    const variant = createMockComponent();
    const addSpy = attachAddProp(variant);
    set.appendChild(variant as unknown as SceneNode);
    Object.defineProperty(set, 'componentPropertyDefinitions', { value: {} });

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Btn',
      framework: 'react',
      variantMatrix: { variant: ['default'] },
      props: [{ name: 'loading', type: 'boolean', default: false }],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: 'space/md',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };

    const result = applyProperties(spec, asComponentSetNode(set));
    expect(result.propKeys.loading).toBe('loading#mock:0');
    expect(addSpy).toHaveBeenCalledWith('loading', 'BOOLEAN', false);
  });

  it('soft-fails per variant but stays ok when one variant succeeds', () => {
    const set = createMockComponentSet();
    Object.defineProperty(set, 'remote', { value: false });
    const failing = createMockComponent({ name: 'v0' }) as MockComponentWithAdd;
    failing.addComponentProperty = vi.fn(function throwAdd() {
      throw new Error('fail');
    });
    const succeeding = createMockComponent({ name: 'v1' });
    attachAddProp(succeeding);
    set.appendChild(failing as unknown as SceneNode);
    set.appendChild(succeeding as unknown as SceneNode);
    Object.defineProperty(set, 'componentPropertyDefinitions', { value: {} });

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Btn',
      framework: 'react',
      variantMatrix: { variant: ['default'] },
      props: [{ name: 'loading', type: 'boolean', default: false }],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: 'space/md',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };

    const result = applyProperties(spec, asComponentSetNode(set));
    expect(result.ok).toBe(true);
    expect(result.failures).toHaveLength(1);
  });

  it('returns ok:false when all variants fail for a prop', () => {
    const set = createMockComponentSet();
    Object.defineProperty(set, 'remote', { value: false });
    const v1 = createMockComponent({ name: 'v0' }) as MockComponentWithAdd;
    const v2 = createMockComponent({ name: 'v1' }) as MockComponentWithAdd;
    v1.addComponentProperty = vi.fn(function throwAdd() {
      throw new Error('fail');
    });
    v2.addComponentProperty = vi.fn(function throwAdd2() {
      throw new Error('fail');
    });
    set.appendChild(v1 as unknown as SceneNode);
    set.appendChild(v2 as unknown as SceneNode);
    Object.defineProperty(set, 'componentPropertyDefinitions', { value: {} });

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Btn',
      framework: 'react',
      variantMatrix: { variant: ['default'] },
      props: [{ name: 'loading', type: 'boolean', default: false }],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: 'space/md',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };

    const result = applyProperties(spec, asComponentSetNode(set));
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(2);
  });

  it('fails early on read-only library component', () => {
    const set = createMockComponentSet();
    Object.defineProperty(set, 'remote', { value: true });
    const result = applyProperties(chipFixture as ComponentSpecV1, asComponentSetNode(set));
    expect(result.ok).toBe(false);
    expect(result.failures[0].message).toContain('read-only');
  });
});

type MockComponentWithAdd = ReturnType<typeof createMockComponent> & {
  addComponentProperty: (
    name: string,
    type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
    defaultValue: string | boolean,
  ) => string;
};

function attachAddProp(component: ReturnType<typeof createMockComponent>) {
  const spy = vi.fn(function addComponentProperty(
    name: string,
    _type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
    _defaultValue: string | boolean,
  ) {
    return name + '#mock:0';
  });
  (component as MockComponentWithAdd).addComponentProperty = spy;
  return spy;
}
