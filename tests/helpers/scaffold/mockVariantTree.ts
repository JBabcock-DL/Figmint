/// <reference types="@figma/plugin-typings" />

import {
  MockFrame,
  MockTextNode,
  createMockFrame,
} from '../../unit/core/canvas/__mocks__/figmaFrames';
import {
  createMockComponentSet,
  type MockComponent,
  type MockComponentSet,
} from '../../unit/core/components/scaffold/__mocks__/figmaScaffold';

type BindableFrame = MockFrame & {
  boundVariables: Record<string, { id: string }>;
  topLeftRadius: number;
  topRightRadius: number;
  bottomLeftRadius: number;
  bottomRightRadius: number;
  setBoundVariable(field: string, variable: { id: string; name: string; resolvedType: string }): void;
};

type BindableText = MockTextNode & {
  textStyleId: string;
  boundVariables: Record<string, { id: string }>;
  setBoundVariable(field: string, variable: { id: string; name: string; resolvedType: string }): void;
};

function enhanceBindableFrame(frame: MockFrame): BindableFrame {
  const bindable = frame as unknown as BindableFrame;
  bindable.boundVariables = {};
  bindable.topLeftRadius = 0;
  bindable.topRightRadius = 0;
  bindable.bottomLeftRadius = 0;
  bindable.bottomRightRadius = 0;
  bindable.setBoundVariable = function setBoundVariable(
    field: string,
    variable: { id: string; name: string; resolvedType: string },
  ): void {
    bindable.boundVariables[field] = { id: variable.id };
  };
  return bindable;
}

function enhanceBindableText(text: MockTextNode): BindableText {
  const bindable = text as unknown as BindableText;
  bindable.textStyleId = '';
  bindable.boundVariables = {};
  bindable.setBoundVariable = function setBoundVariable(
    field: string,
    variable: { id: string; name: string; resolvedType: string },
  ): void {
    bindable.boundVariables[field] = { id: variable.id };
  };
  return bindable;
}

function buildVariantLayerTree(): BindableFrame {
  const root = enhanceBindableFrame(createMockFrame({ name: 'variant=primary, size=default' }, false));
  Object.defineProperty(root, 'type', { value: 'COMPONENT' });

  root.appendChild(
    enhanceBindableFrame(createMockFrame({ name: 'icon-slot/leading' }, false)) as unknown as SceneNode,
  );
  const labelText = enhanceBindableText(new MockTextNode());
  labelText.name = 'text/label';
  root.appendChild(labelText as unknown as SceneNode);
  root.appendChild(
    enhanceBindableFrame(createMockFrame({ name: 'icon-slot/trailing' }, false)) as unknown as SceneNode,
  );
  root.appendChild(
    enhanceBindableFrame(createMockFrame({ name: 'state-layer/hover' }, false)) as unknown as SceneNode,
  );
  root.appendChild(
    enhanceBindableFrame(createMockFrame({ name: 'focus-ring' }, false)) as unknown as SceneNode,
  );

  return root;
}

export function buildMockVariantTree(variantCount?: number): {
  componentSet: MockComponentSet;
  variants: MockComponent[];
} {
  const count = variantCount !== undefined ? variantCount : 2;
  const componentSet = createMockComponentSet();
  const setFrame = componentSet as unknown as MockFrame;
  const variants: MockComponent[] = [];

  for (let i = 0; i < count; i++) {
    const variant = buildVariantLayerTree() as unknown as MockComponent;
    variant.name = 'variant=' + String(i);
    setFrame.appendChild(variant as unknown as SceneNode);
    variants.push(variant);
  }

  return { componentSet: componentSet, variants: variants };
}

export type { BindableFrame, BindableText };
