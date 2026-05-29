import { describe, expect, it } from 'vitest';

import {
  normalizeVariablePath,
  parseBindingSelector,
  resolveNodeByPath,
  validateKindForNode,
} from '@/core/components/scaffold/selector';

import { createMockComponent, asComponentNode } from './__mocks__/figmaScaffold';
import { MockTextNode, createMockFrame } from '../../canvas/__mocks__/figmaFrames';

describe('parseBindingSelector', () => {
  it('parses root.fill', () => {
    expect(parseBindingSelector('root.fill')).toEqual({ nodePath: 'root', kind: 'fill' });
  });

  it('parses text/label.text-style', () => {
    expect(parseBindingSelector('text/label.text-style')).toEqual({
      nodePath: 'text/label',
      kind: 'text-style',
    });
  });

  it('throws for invalid kind', () => {
    expect(() => parseBindingSelector('root.color')).toThrow('invalid binding kind: color');
  });

  it('throws when dot suffix is missing', () => {
    expect(() => parseBindingSelector('root')).toThrow('invalid binding selector');
  });
});

describe('normalizeVariablePath', () => {
  it('strips Theme/ collection prefix', () => {
    expect(normalizeVariablePath('Theme/color/primary/default')).toBe('color/primary/default');
  });

  it('leaves canonical paths unchanged', () => {
    expect(normalizeVariablePath('space/md')).toBe('space/md');
  });
});

describe('resolveNodeByPath', () => {
  it('walks WO-022 slash layer names on direct children', () => {
    const variant = createMockComponent();
    variant.appendChild(createMockFrame({ name: 'text/label' }, false) as unknown as SceneNode);
    variant.appendChild(
      createMockFrame({ name: 'icon-slot/leading' }, false) as unknown as SceneNode,
    );
    variant.appendChild(
      createMockFrame({ name: 'state-layer/hover' }, false) as unknown as SceneNode,
    );
    variant.appendChild(createMockFrame({ name: 'focus-ring' }, false) as unknown as SceneNode);

    const component = asComponentNode(variant);
    expect(resolveNodeByPath(component, 'text/label')?.name).toBe('text/label');
    expect(resolveNodeByPath(component, 'icon-slot/leading')?.name).toBe('icon-slot/leading');
    expect(resolveNodeByPath(component, 'state-layer/hover')?.name).toBe('state-layer/hover');
    expect(resolveNodeByPath(component, 'focus-ring')?.name).toBe('focus-ring');
    expect(resolveNodeByPath(component, 'root')).toBe(component);
  });

  it('returns null when a segment is missing', () => {
    const variant = createMockComponent();
    expect(resolveNodeByPath(asComponentNode(variant), 'text/label')).toBeNull();
  });
});

describe('validateKindForNode', () => {
  it('returns type-mismatch for radius on TextNode', () => {
    const text = new MockTextNode();
    expect(validateKindForNode(text as unknown as TextNode, 'radius')).toBe('type-mismatch');
  });

  it('allows fill on TextNode', () => {
    const text = new MockTextNode();
    expect(validateKindForNode(text as unknown as TextNode, 'fill')).toBeNull();
  });
});
