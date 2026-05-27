export type VariablePathMap = Record<string, Variable>;

/** Rebuild path → Variable from local file — ignores host-injected maps (legacy §0). */
export async function ensureLocalVariableMap(): Promise<VariablePathMap> {
  const allVars = await figma.variables.getLocalVariablesAsync();
  const map: VariablePathMap = {};
  for (let i = 0; i < allVars.length; i++) {
    map[allVars[i].name] = allVars[i];
  }
  return map;
}

/** Slash-path lookup; returns null when absent (canvas falls back to hardcoded hex). */
export function resolvePath(map: VariablePathMap, path: string): Variable | null {
  const variable = map[path];
  if (variable !== undefined) {
    return variable;
  }
  return null;
}

/** Optional v1 — canonical path with alias-map fallback for foreign files. */
export function resolveCanonicalPath(
  path: string,
  map: VariablePathMap,
  aliasMap?: Record<string, string> | null,
): string | null {
  if (map[path] !== undefined) {
    return path;
  }
  if (aliasMap !== null && aliasMap !== undefined) {
    const alias = aliasMap[path];
    if (alias !== undefined && map[alias] !== undefined) {
      return alias;
    }
  }
  return null;
}

/** Resolve chrome variables by canonical paths for table chrome binding. */
export async function resolveChromeVariables(
  paths: string[],
  map: VariablePathMap,
  aliasMap?: Record<string, string> | null,
): Promise<Record<string, Variable | null>> {
  const result: Record<string, Variable | null> = {};
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const resolvedPath = resolveCanonicalPath(path, map, aliasMap);
    if (resolvedPath !== null) {
      result[path] = map[resolvedPath];
    } else {
      result[path] = null;
    }
  }
  return result;
}
