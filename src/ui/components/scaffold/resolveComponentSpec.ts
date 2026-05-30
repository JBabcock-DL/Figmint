import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { kebabCase } from '@/core/drift/componentKeys';
import { findComponentSpecPathInRepo } from '@/io/github/componentSpecPaths';
import { loadFromGitHub } from '@/io/sources/github';

export const SPEC_RESOLUTION_PATHS = [
  function pathComponents(key: string): string {
    return 'design/components/' + key + '.component-spec.v1.json';
  },
  function pathLegacy(key: string): string {
    return 'design/component-specs/' + key + '.v1.json';
  },
] as const;

export function buildSpecFilePath(specsPath: string, componentKey: string): string {
  let base = specsPath;
  if (base.length > 0 && !base.endsWith('/')) {
    base = base + '/';
  }
  return base + componentKey + '.json';
}

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
  specsPath?: string,
  repoPaths?: readonly string[],
): Promise<
  | { ok: true; spec: ComponentSpecV1; path: string }
  | { ok: false; message: string; triedPaths: string[] }
> {
  const triedPaths: string[] = [];

  if (repoPaths !== undefined && repoPaths.length > 0) {
    const discoveredPath = findComponentSpecPathInRepo(repoPaths, componentKey, specsPath);
    if (discoveredPath !== null) {
      triedPaths.push(discoveredPath);
      const discoveredResult = await loadFromGitHub(repoUrl, discoveredPath);
      if ('payload' in discoveredResult && discoveredResult.kind === 'component-spec') {
        if (isComponentSpecPayload(discoveredResult.payload)) {
          return { ok: true, spec: discoveredResult.payload, path: discoveredPath };
        }
        return {
          ok: false,
          message: 'Invalid component-spec at ' + discoveredPath,
          triedPaths: triedPaths,
        };
      }
    }
  }

  if (specsPath !== undefined && specsPath.length > 0) {
    const configCandidates = [componentKey, kebabCase(componentKey)];
    for (let c = 0; c < configCandidates.length; c++) {
      const configPath = buildSpecFilePath(specsPath, configCandidates[c]);
      if (triedPaths.indexOf(configPath) >= 0) {
        continue;
      }
      triedPaths.push(configPath);
      const configResult = await loadFromGitHub(repoUrl, configPath);
      if ('payload' in configResult && configResult.kind === 'component-spec') {
        if (isComponentSpecPayload(configResult.payload)) {
          return { ok: true, spec: configResult.payload, path: configPath };
        }
        return {
          ok: false,
          message: 'Invalid component-spec at ' + configPath,
          triedPaths: triedPaths,
        };
      }
    }
  }

  const legacyKeys = [componentKey, kebabCase(componentKey)];
  for (let k = 0; k < legacyKeys.length; k++) {
    const legacyKey = legacyKeys[k];
    for (let i = 0; i < SPEC_RESOLUTION_PATHS.length; i++) {
      const path = SPEC_RESOLUTION_PATHS[i](legacyKey);
      if (triedPaths.indexOf(path) >= 0) {
        continue;
      }
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
  }

  const isTestRuntime = import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true';
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
