import { describe, expect, it, vi } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import {
  applyProperties,
  applyPropertiesToVariants,
} from '@/core/components/scaffold/applyProperties';

import {
  asComponentNode,
  asComponentSetNode,
  combineAsVariants,
  createMockComponent,
  createMockPage,
} from './__mocks__/figmaScaffold';

type MockComponentWithAdd = ReturnType<typeof createMockComponent> & {
  addComponentProperty: ReturnType<typeof vi.fn>;
};

function attachAddProp(variant: ReturnType<typeof createMockComponent>): ReturnType<typeof vi.fn> {
  const addSpy = vi.fn(function mockAdd(
    name: string,
    _type: string,
    _defaultValue: string | boolean,
  ) {
    return name + '#mock:' + String(addSpy.mock.calls.length - 1);
  });
  Object.defineProperty(variant, 'addComponentProperty', { value: addSpy });
  return addSpy;
}

describe('applyProperties pre-combine timing', () => {
  it('applyPropertiesToVariants adds props on standalone components', () => {
    const variant = createMockComponent();
    const addSpy = attachAddProp(variant);

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

    const result = applyPropertiesToVariants([asComponentNode(variant)], spec);
    expect(result.propKeys.loading).toBe('loading#mock:0');
    expect(addSpy).toHaveBeenCalledWith('loading', 'BOOLEAN', false);
  });

  it('applyProperties validate-only after pre-combine + combine', () => {
    const page = createMockPage();
    const v0 = createMockComponent({ name: 'variant=default' });
    const v1 = createMockComponent({ name: 'variant=outline' });
    attachAddProp(v0);
    attachAddProp(v1);

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Btn',
      framework: 'react',
      variantMatrix: { variant: ['default', 'outline'] },
      props: [{ name: 'loading', type: 'boolean', default: false }],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: 'space/md',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };

    applyPropertiesToVariants([asComponentNode(v0), asComponentNode(v1)], spec);
    const set = combineAsVariants([asComponentNode(v0), asComponentNode(v1)], page);
    Object.defineProperty(set, 'remote', { value: false });
    Object.defineProperty(set, 'componentPropertyDefinitions', {
      value: {
        variant: { type: 'VARIANT', variantOptions: ['default', 'outline'] },
        'loading#mock:0': { type: 'BOOLEAN', defaultValue: false },
      },
    });

    const callsBefore = (v0 as MockComponentWithAdd).addComponentProperty.mock.calls.length;

    const result = applyProperties(spec, asComponentSetNode(set));
    expect(result.propKeys.loading).toBe('loading#mock:0');
    expect((v0 as MockComponentWithAdd).addComponentProperty.mock.calls.length).toBe(callsBefore);
    expect(result.failures).toHaveLength(0);
  });
});
