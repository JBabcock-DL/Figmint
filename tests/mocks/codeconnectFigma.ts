import type { UnmappedComponentRef } from '@/core/codeconnect/types';

export function mockButtonComponentRef(overrides?: Partial<UnmappedComponentRef>): UnmappedComponentRef {
  const base: UnmappedComponentRef = {
    nodeId: '1:2',
    name: 'Button',
    componentKey: 'button',
    fileKey: 'abc123',
    componentProperties: {
      Variant: {
        type: 'VARIANT',
        defaultValue: 'Default',
      },
      Disabled: {
        type: 'BOOLEAN',
        defaultValue: false,
      },
      Label: {
        type: 'TEXT',
        defaultValue: 'Button',
      },
    },
  };
  if (overrides === undefined) {
    return base;
  }
  return Object.assign({}, base, overrides);
}

export function mockComponentPropertyDefinitions(): Record<
  string,
  { type: string; defaultValue?: string | boolean; variantOptions?: string[] }
> {
  return {
    Variant: {
      type: 'VARIANT',
      defaultValue: 'Default',
      variantOptions: ['Default', 'Destructive'],
    },
    Disabled: { type: 'BOOLEAN', defaultValue: false },
    Label: { type: 'TEXT', defaultValue: 'Button' },
  };
}
