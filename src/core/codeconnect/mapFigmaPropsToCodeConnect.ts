export interface FigmaPropDefinition {
  type: string;
  defaultValue?: string | boolean;
  variantOptions?: readonly string[];
}

export interface MapPropsResult {
  /** Lines inside `props: { ... }` block — indented, trailing commas */
  propLines: string[];
  /** TS-safe prop names for example spread */
  examplePropNames: string[];
}

function toCamelCase(name: string): string {
  const parts = name.split(/[\s_\-/]+/);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) {
      continue;
    }
    if (result.length === 0) {
      result = part.charAt(0).toLowerCase() + part.slice(1);
    } else {
      result = result + part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
  }
  if (result.length === 0) {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }
  return result;
}

function toEnumKey(option: string): string {
  const parts = option.split(/[\s_\-/]+/);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) {
      continue;
    }
    result = result + part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  if (result.length === 0) {
    return 'Option';
  }
  return result.replace(/[^a-zA-Z0-9]/g, '');
}

function toKebabValue(option: string): string {
  return option
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function buildVariantLine(camelName: string, originalName: string, options: readonly string[]): string {
  let enumBody = '';
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const key = toEnumKey(option);
    const value = toKebabValue(option);
    if (enumBody.length > 0) {
      enumBody = enumBody + ', ';
    }
    enumBody = enumBody + key + ": '" + value + "'";
  }
  return (
    camelName +
    ": figma.enum('" +
    originalName +
    "', { " +
    enumBody +
    ' }),'
  );
}

export function mapFigmaPropsToCodeConnect(
  componentProperties: Record<string, FigmaPropDefinition>,
): MapPropsResult {
  const propLines: string[] = [];
  const examplePropNames: string[] = [];
  const keys = Object.keys(componentProperties);

  for (let i = 0; i < keys.length; i++) {
    const originalName = keys[i];
    const def = componentProperties[originalName];
    const camelName = toCamelCase(originalName);
    const propType = def.type;

    if (propType === 'VARIANT') {
      const options =
        def.variantOptions !== undefined && def.variantOptions.length > 0
          ? def.variantOptions
          : def.defaultValue !== undefined && typeof def.defaultValue === 'string'
            ? [def.defaultValue]
            : ['Default'];
      propLines.push('      ' + buildVariantLine(camelName, originalName, options));
      examplePropNames.push(camelName);
    } else if (propType === 'BOOLEAN') {
      propLines.push("      " + camelName + ": figma.boolean('" + originalName + "'),");
      examplePropNames.push(camelName);
    } else if (propType === 'TEXT') {
      propLines.push("      " + camelName + ": figma.string('" + originalName + "'),");
      examplePropNames.push(camelName);
    } else if (propType === 'INSTANCE_SWAP') {
      propLines.push("      " + camelName + ": figma.instance('" + originalName + "'),");
      examplePropNames.push(camelName);
    }
  }

  return { propLines: propLines, examplePropNames: examplePropNames };
}
