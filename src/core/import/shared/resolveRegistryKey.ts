import { kebabCase } from '@/core/drift/componentKeys';

export function resolveRegistryKey(
  componentName: string,
  registryKeys: readonly string[],
  nameToKey?: Readonly<Record<string, string>>,
): string | null {
  if (nameToKey !== undefined) {
    const override = nameToKey[componentName];
    if (override !== undefined) {
      return registryKeys.includes(override) ? override : null;
    }
  }

  for (let i = 0; i < registryKeys.length; i++) {
    if (registryKeys[i] === componentName) {
      return componentName;
    }
  }

  const kebab = kebabCase(componentName);
  for (let j = 0; j < registryKeys.length; j++) {
    if (registryKeys[j] === kebab) {
      return registryKeys[j];
    }
  }

  return null;
}
