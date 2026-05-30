import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';

export function buildVariantMatrix(
  props: ComponentSpecProp[],
  cvaAxes: Record<string, string[]> | null,
): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};
  const axisNames =
    cvaAxes !== null ? Object.keys(cvaAxes) : ['variant', 'size'];

  for (let i = 0; i < axisNames.length; i++) {
    const axis = axisNames[i];
    if (axis === 'state') {
      continue;
    }
    if (cvaAxes !== null && cvaAxes[axis] !== undefined) {
      matrix[axis] = cvaAxes[axis].slice();
      continue;
    }
    for (let j = 0; j < props.length; j++) {
      const prop = props[j];
      if (prop.name === axis && prop.type === 'enum' && prop.enum !== undefined) {
        matrix[axis] = prop.enum.map(String);
      }
    }
  }

  return matrix;
}
