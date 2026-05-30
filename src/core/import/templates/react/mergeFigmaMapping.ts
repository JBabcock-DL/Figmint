import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';

export interface FigmaEnumMapping {
  propRenames: Record<string, string>;
  enumOverrides: Record<string, Record<string, string>>;
}

const ENUM_CALL = /figma\.enum\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g;
const BOOLEAN_CALL = /figma\.boolean\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function parseEnumPairs(body: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const pairPattern = /(['"]?)([A-Za-z0-9_-]+)\1\s*:\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(body)) !== null) {
    pairs[match[2]] = match[3];
  }
  return pairs;
}

export function parseFigmaMappingText(figmaMappingText: string): FigmaEnumMapping {
  const mapping: FigmaEnumMapping = { propRenames: {}, enumOverrides: {} };

  let enumMatch: RegExpExecArray | null;
  while ((enumMatch = ENUM_CALL.exec(figmaMappingText)) !== null) {
    const figmaLabel = enumMatch[1];
    const axisKey = figmaLabel.charAt(0).toLowerCase() + figmaLabel.slice(1);
    const pairs = parseEnumPairs(enumMatch[2]);
    mapping.enumOverrides[axisKey] = pairs;
  }

  let boolMatch: RegExpExecArray | null;
  while ((boolMatch = BOOLEAN_CALL.exec(figmaMappingText)) !== null) {
    const figmaName = boolMatch[1];
    const codeName = figmaName.charAt(0).toLowerCase() + figmaName.slice(1);
    mapping.propRenames[figmaName] = codeName;
  }

  return mapping;
}

export function mergeFigmaMappingIntoSpec(
  props: ComponentSpecProp[],
  variantMatrix: Record<string, string[]>,
  mapping: FigmaEnumMapping,
): { props: ComponentSpecProp[]; variantMatrix: Record<string, string[]> } {
  const mergedProps = props.slice();
  const mergedMatrix: Record<string, string[]> = {};

  const matrixKeys = Object.keys(variantMatrix);
  for (let i = 0; i < matrixKeys.length; i++) {
    const axis = matrixKeys[i];
    mergedMatrix[axis] = variantMatrix[axis].slice();
  }

  const overrideKeys = Object.keys(mapping.enumOverrides);
  for (let i = 0; i < overrideKeys.length; i++) {
    const axis = overrideKeys[i];
    const overrides = mapping.enumOverrides[axis];
    const codeValues = Object.keys(overrides).map(function (figmaLabel) {
      return overrides[figmaLabel];
    });
    if (mergedMatrix[axis] !== undefined) {
      mergedMatrix[axis] = codeValues;
    }
    for (let j = 0; j < mergedProps.length; j++) {
      if (mergedProps[j].name === axis && mergedProps[j].type === 'enum') {
        mergedProps[j] = Object.assign({}, mergedProps[j], { enum: codeValues });
      }
    }
  }

  return { props: mergedProps, variantMatrix: mergedMatrix };
}
