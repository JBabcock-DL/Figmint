import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

export function countVariantCrossProduct(
  matrix: ComponentSpecV1['variantMatrix'],
): number {
  const keys = Object.keys(matrix);
  if (keys.length === 0) {
    return 1;
  }
  let product = 1;
  for (let i = 0; i < keys.length; i++) {
    const axis = matrix[keys[i]];
    const length = Array.isArray(axis) ? axis.length : 0;
    product *= length > 0 ? length : 1;
  }
  return product;
}

export function detectCssSelectorWarnings(bindings: ComponentSpecV1['bindings']): string[] {
  const warnings: string[] = [];
  for (let i = 0; i < bindings.length; i++) {
    const selector = bindings[i].selector;
    if (selector.startsWith('.')) {
      warnings.push(
        'Binding "' +
          selector +
          '" uses a CSS class selector — use layer paths like root.fill per WO-023.',
      );
    }
  }
  return warnings;
}
