import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bindGapToVar, bindPaddingToVar, bindRadiusToVar } from '@/core/components/scaffold/bindNumeric';

import { createMockFrame } from '../../canvas/__mocks__/figmaFrames';

function createNumericNode() {
  const frame = createMockFrame(undefined, false);
  const boundFields: string[] = [];
  const node = frame as unknown as FrameNode & {
    setBoundVariable(field: VariableBindableNodeField, variable: Variable): void;
  };
  node.setBoundVariable = function setBoundVariable(
    field: VariableBindableNodeField,
    _variable: Variable,
  ): void {
    boundFields.push(field);
  };
  return { node: node, boundFields: boundFields };
}

function mockFloatVariable(): Variable {
  return { id: 'float-1', name: 'space/md', resolvedType: 'FLOAT' } as Variable;
}

describe('bindNumeric helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bindPaddingToVar calls setBoundVariable four times', () => {
    const { node, boundFields } = createNumericNode();
    bindPaddingToVar(node, mockFloatVariable());
    expect(boundFields).toEqual(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']);
  });

  it('bindGapToVar calls setBoundVariable once', () => {
    const { node, boundFields } = createNumericNode();
    bindGapToVar(node, mockFloatVariable());
    expect(boundFields).toEqual(['itemSpacing']);
  });

  it('bindRadiusToVar calls setBoundVariable four times', () => {
    const { node, boundFields } = createNumericNode();
    bindRadiusToVar(node, mockFloatVariable());
    expect(boundFields).toEqual([
      'topLeftRadius',
      'topRightRadius',
      'bottomLeftRadius',
      'bottomRightRadius',
    ]);
  });
});
