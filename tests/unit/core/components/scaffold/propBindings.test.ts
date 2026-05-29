import { describe, expect, it } from 'vitest';

import { createMockComponent } from './__mocks__/figmaScaffold';
import { createMockFrame, MockTextNode } from '../../canvas/__mocks__/figmaFrames';
import {
  PROP_NODE_BINDINGS,
  wireComponentPropertyReferences,
} from '@/core/components/scaffold/propBindings';
import { resolveBindingTarget } from '@/core/components/scaffold/resolveBindingTarget';

import { asComponentNode } from './__mocks__/figmaScaffold';

type MockNodeWithRefs = MockTextNode & {
  componentPropertyReferences?: Record<string, string>;
};

function buildVariantTree(): ReturnType<typeof createMockComponent> {
  const variant = createMockComponent({ name: 'variant=default' });
  const leading = createMockFrame({ name: 'icon-slot/leading', width: 24, height: 24 });
  Object.defineProperty(leading, 'type', { value: 'FRAME' });
  Object.defineProperty(leading, 'visible', { value: true, writable: true });
  variant.appendChild(leading as unknown as SceneNode);

  const label = new MockTextNode() as MockNodeWithRefs;
  label.name = 'text/label';
  label.characters = 'Button';
  variant.appendChild(label as unknown as SceneNode);

  return variant;
}

describe('propBindings', () => {
  it('exports convention map entries', () => {
    expect(PROP_NODE_BINDINGS.label.nodePath).toBe('text/label');
    expect(PROP_NODE_BINDINGS.leadingIcon.ref).toBe('visible');
  });

  it('binds label characters and icon visible refs', () => {
    const variant = buildVariantTree();
    const labelBinding = PROP_NODE_BINDINGS.label;
    const iconBinding = PROP_NODE_BINDINGS.leadingIcon;

    const labelWired = wireComponentPropertyReferences(
      asComponentNode(variant),
      'Label#mock:0',
      labelBinding,
    );
    expect(labelWired.ok).toBe(true);

    const iconWired = wireComponentPropertyReferences(
      asComponentNode(variant),
      'Leading icon#mock:0',
      iconBinding,
    );
    expect(iconWired.ok).toBe(true);

    const labelNode = resolveBindingTarget(
      asComponentNode(variant),
      'text/label',
    ) as MockNodeWithRefs;
    expect(labelNode.componentPropertyReferences).toEqual({ characters: 'Label#mock:0' });
  });

  it('returns ok:false when bind target missing', () => {
    const variant = createMockComponent();
    const wired = wireComponentPropertyReferences(
      asComponentNode(variant),
      'loading#mock:0',
      PROP_NODE_BINDINGS.label,
    );
    expect(wired.ok).toBe(false);
  });
});

describe('resolveBindingTarget', () => {
  it('walks slash-separated paths including icon-slot names', () => {
    const variant = buildVariantTree();
    const label = resolveBindingTarget(asComponentNode(variant), 'text/label');
    expect(label).not.toBeNull();
    expect(label !== null && label.name).toBe('text/label');
  });
});
