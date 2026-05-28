type NumericBindNode = FrameNode | ComponentNode | InstanceNode;

function assertFloatVariable(variable: Variable): void {
  if (variable.resolvedType !== 'FLOAT') {
    throw new Error('expected FLOAT variable, got ' + variable.resolvedType);
  }
}

export function bindPaddingToVar(node: NumericBindNode, variable: Variable): void {
  assertFloatVariable(variable);
  node.setBoundVariable('paddingLeft', variable);
  node.setBoundVariable('paddingRight', variable);
  node.setBoundVariable('paddingTop', variable);
  node.setBoundVariable('paddingBottom', variable);
}

export function bindGapToVar(node: NumericBindNode, variable: Variable): void {
  assertFloatVariable(variable);
  node.setBoundVariable('itemSpacing', variable);
}

export function bindRadiusToVar(node: NumericBindNode, variable: Variable): void {
  assertFloatVariable(variable);
  node.setBoundVariable('topLeftRadius', variable);
  node.setBoundVariable('topRightRadius', variable);
  node.setBoundVariable('bottomLeftRadius', variable);
  node.setBoundVariable('bottomRightRadius', variable);
}
