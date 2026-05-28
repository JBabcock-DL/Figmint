export function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toComponentDriftId(specName: string): string {
  return 'cmp/' + kebabCase(specName);
}

export function registryKeyFromSpecName(specName: string): string {
  return specName;
}
