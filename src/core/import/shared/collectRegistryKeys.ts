import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

/**
 * Merge canvas snapshot registry keys with optional repo `.fighub-registry.json` keys.
 * Canvas snapshot is SSOT per WO-058; repo file is an optional supplement when present on GitHub.
 *
 * WO-044 `import/parse` handler merge (no main.ts edits in WO-043):
 * 1. Read canvas registry from snapshot handler
 * 2. Optional `loadFromGitHub(repoUrl, '.fighub-registry.json')` best-effort
 * 3. `registryKeys = collectRegistryKeys(canvas, repo)`
 * 4. Pass to `ImportTemplateContext.registryKeys`
 */
export function collectRegistryKeys(
  canvasRegistry: RegistryV1 | null | undefined,
  repoRegistry: RegistryV1 | null | undefined,
): string[] {
  const keys: Record<string, boolean> = {};

  if (canvasRegistry !== null && canvasRegistry !== undefined && canvasRegistry.components) {
    const canvasComponentKeys = Object.keys(canvasRegistry.components);
    for (let i = 0; i < canvasComponentKeys.length; i++) {
      keys[canvasComponentKeys[i]] = true;
    }
  }

  if (repoRegistry !== null && repoRegistry !== undefined && repoRegistry.components) {
    const repoComponentKeys = Object.keys(repoRegistry.components);
    for (let j = 0; j < repoComponentKeys.length; j++) {
      keys[repoComponentKeys[j]] = true;
    }
  }

  return Object.keys(keys).sort();
}
