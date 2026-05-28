/// <reference types="@figma/plugin-typings" />

import {
  MockFrame,
  MockTextNode,
  createMockFrame,
} from '../../../../unit/core/canvas/__mocks__/figmaFrames';

import {
  createMockComponent,
  createMockComponentSet,
  type MockComponent,
  type MockComponentSet,
} from '../../../../unit/core/components/scaffold/__mocks__/figmaScaffold';

export interface MockPropertyDefinition {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue?: string | boolean;
  variantOptions?: string[];
}

export interface MockComponentSetFactoryOptions {
  variantCount?: number;
  variantMatrix?: Record<string, string[]>;
  includeLabel?: boolean;
  includeIconSlots?: boolean;
}

export interface MockComponentSetFactoryResult {
  componentSet: MockComponentSet;
  variants: MockComponent[];
  addPropertyCalls: Array<{
    variantIndex: number;
    name: string;
    type: string;
    defaultValue: string | boolean;
  }>;
}

function attachAddComponentProperty(
  component: MockComponent,
  variantIndex: number,
  calls: MockComponentSetFactoryResult['addPropertyCalls'],
): void {
  const comp = component as MockComponent & {
    addComponentProperty: (
      name: string,
      type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
      defaultValue: string | boolean,
    ) => string;
    componentPropertyReferences?: Record<string, string>;
  };

  comp.addComponentProperty = function addComponentProperty(
    name: string,
    type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
    defaultValue: string | boolean,
  ): string {
    calls.push({
      variantIndex: variantIndex,
      name: name,
      type: type,
      defaultValue: defaultValue,
    });
    return name + '#mock:0';
  };

  comp.componentPropertyReferences = {};
}

function buildChipVariantTree(
  component: MockComponent,
  options: { includeLabel: boolean; includeIconSlots: boolean },
): void {
  if (options.includeIconSlots) {
    const leading = createMockFrame({ name: 'icon-slot/leading', width: 24, height: 24 });
    Object.defineProperty(leading, 'type', { value: 'FRAME' });
    (leading as MockFrame & { visible: boolean }).visible = true;
    component.appendChild(leading as unknown as SceneNode);
  }

  if (options.includeLabel) {
    const label = new MockTextNode();
    label.name = 'text/label';
    label.characters = 'Button';
    component.appendChild(label as unknown as SceneNode);
  }

  if (options.includeIconSlots) {
    const trailing = createMockFrame({ name: 'icon-slot/trailing', width: 24, height: 24 });
    Object.defineProperty(trailing, 'type', { value: 'FRAME' });
    (trailing as MockFrame & { visible: boolean }).visible = false;
    component.appendChild(trailing as unknown as SceneNode);
  }
}

function seedVariantDefinitions(
  componentSet: MockComponentSet,
  variantMatrix: Record<string, string[]>,
): void {
  const defs: ComponentPropertyDefinitions = {};
  const axisKeys = Object.keys(variantMatrix);

  for (let i = 0; i < axisKeys.length; i++) {
    const axis = axisKeys[i];
    defs[axis] = {
      type: 'VARIANT',
      defaultValue: '',
      variantOptions: variantMatrix[axis].slice(),
    };
  }

  Object.defineProperty(componentSet, 'componentPropertyDefinitions', {
    value: defs,
    writable: true,
    configurable: true,
  });
}

export function createMockComponentSetWithVariants(
  options?: MockComponentSetFactoryOptions,
): MockComponentSetFactoryResult {
  const variantCount = options !== undefined && options.variantCount !== undefined ? options.variantCount : 2;
  const includeLabel =
    options !== undefined && options.includeLabel !== undefined ? options.includeLabel : true;
  const includeIconSlots =
    options !== undefined && options.includeIconSlots !== undefined ? options.includeIconSlots : true;

  const componentSet = createMockComponentSet();
  Object.defineProperty(componentSet, 'remote', { value: false, writable: true });

  const variants: MockComponent[] = [];
  const addPropertyCalls: MockComponentSetFactoryResult['addPropertyCalls'] = [];

  for (let i = 0; i < variantCount; i++) {
    const variant = createMockComponent({ name: 'variant=' + String(i) });
    buildChipVariantTree(variant, { includeLabel: includeLabel, includeIconSlots: includeIconSlots });
    attachAddComponentProperty(variant, i, addPropertyCalls);
    componentSet.appendChild(variant as unknown as SceneNode);
    variants.push(variant);
  }

  if (options !== undefined && options.variantMatrix !== undefined) {
    seedVariantDefinitions(componentSet, options.variantMatrix);
  }

  return {
    componentSet: componentSet,
    variants: variants,
    addPropertyCalls: addPropertyCalls,
  };
}

export function asComponentSetNode(mock: MockComponentSet): ComponentSetNode {
  return mock as unknown as ComponentSetNode;
}
