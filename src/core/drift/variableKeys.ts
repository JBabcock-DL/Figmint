export function toVariableKey(collectionName: string, variableName: string): string {
  const normalizedName = variableName.charAt(0) === '/' ? variableName.slice(1) : variableName;
  return collectionName + '/' + normalizedName;
}

export function toVariableDriftId(collectionName: string, variableName: string): string {
  return 'var/' + toVariableKey(collectionName, variableName);
}

export function parseVariableDriftId(id: string): { collectionName: string; variableName: string } | null {
  if (!id.startsWith('var/')) {
    return null;
  }
  const key = id.slice('var/'.length);
  const slashIndex = key.indexOf('/');
  if (slashIndex <= 0) {
    return null;
  }
  return {
    collectionName: key.slice(0, slashIndex),
    variableName: key.slice(slashIndex + 1),
  };
}
