import { DOC_CHROME_PATHS } from '@/core/variables/documentationChrome';

import type { VariablePathMap } from './variables';
import { resolvePath } from './variables';

/** Product-token preview fills still bound from Primitives during table build. */
const PREVIEW_TOKEN_PATHS = ['color/neutral/100', 'color/primary/200'] as const;

/** Documentation chrome + primitive preview paths for `buildTable`. */
export function resolveTableChromeVariables(
  map: VariablePathMap,
): Record<string, Variable | null> {
  const result: Record<string, Variable | null> = {};
  for (let i = 0; i < DOC_CHROME_PATHS.length; i++) {
    const path = DOC_CHROME_PATHS[i];
    result[path] = resolvePath(map, path);
  }
  for (let pi = 0; pi < PREVIEW_TOKEN_PATHS.length; pi++) {
    const path = PREVIEW_TOKEN_PATHS[pi];
    result[path] = resolvePath(map, path);
  }
  return result;
}
