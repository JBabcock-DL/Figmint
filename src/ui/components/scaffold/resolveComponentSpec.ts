import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { loadFromGitHub } from '@/io/sources/github';

export const SPEC_RESOLUTION_PATHS = [
  function pathComponents(key: string): string {
    return 'design/components/' + key + '.component-spec.v1.json';
  },
  function pathLegacy(key: string): string {
    return 'design/component-specs/' + key + '.v1.json';
  },
] as const;

function isComponentSpecPayload(value: unknown): value is ComponentSpecV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.v === 1 && record.kind === 'component-spec';
}

export async function resolveComponentSpecFromRepo(
  repoUrl: string,
  componentKey: string,
): Promise<
  | { ok: true; spec: ComponentSpecV1; path: string }
  | { ok: false; message: string; triedPaths: string[] }
> {
  const triedPaths: string[] = [];

  for (let i = 0; i < SPEC_RESOLUTION_PATHS.length; i++) {
    const path = SPEC_RESOLUTION_PATHS[i](componentKey);
    triedPaths.push(path);
    const result = await loadFromGitHub(repoUrl, path);
    if ('payload' in result && result.kind === 'component-spec') {
      if (isComponentSpecPayload(result.payload)) {
        return { ok: true, spec: result.payload, path: path };
      }
      return {
        ok: false,
        message: 'Invalid component-spec at ' + path,
        triedPaths: triedPaths,
      };
    }
  }

  const isTestRuntime =
    import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true';
  if (import.meta.env.DEV && !isTestRuntime) {
    const { loadBenchFixture } = await import('@/ui/benchFixtures');
    const doc = loadBenchFixture('component-spec-button-canonical');
    if (isComponentSpecPayload(doc.payload)) {
      return {
        ok: true,
        spec: doc.payload,
        path: 'tests/fixtures/component-spec-button-canonical.json (dev bench)',
      };
    }
  }

  return {
    ok: false,
    message: 'No component-spec on disk for "' + componentKey + '".',
    triedPaths: triedPaths,
  };
}
