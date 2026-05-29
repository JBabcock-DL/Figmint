import type { ComponentDriftEntry, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';

import { classifyThreeWay, isSynced } from './classify';
import {
  buildComponentDiff,
  componentComparableEqual,
  componentHashEqual,
} from './componentDiff';
import { toComponentDriftId } from './componentKeys';
import type {
  ComponentComparable,
  ComponentDiff,
  ComponentDriftDetectInput,
  ComponentDriftDetectResult,
  ComponentDriftPayload,
} from './types';

export function specToComparable(spec: ComponentSpecV1): ComponentComparable {
  const matrix = spec.variantMatrix;
  return {
    specName: spec.name,
    variantMatrixHash: hashVariantMatrix(matrix),
    variantMatrix: Object.assign({}, matrix),
    props: spec.props.slice(),
    bindings: spec.bindings.slice(),
  };
}

export function buildRepoSpecMap(
  specs: { name: string; spec: ComponentSpecV1 }[],
): Record<string, ComponentComparable> {
  const result: Record<string, ComponentComparable> = {};
  for (let i = 0; i < specs.length; i++) {
    const entry = specs[i];
    const comparable = specToComparable(entry.spec);
    result[entry.name] = comparable;
  }
  return result;
}

function wrapPayload(comparable: ComponentComparable | null, diff?: ComponentDiff): ComponentDriftPayload | null {
  if (comparable === null) {
    return null;
  }
  const payload: ComponentDriftPayload = { comparable: comparable };
  if (diff !== undefined) {
    payload.diff = diff;
  }
  return payload;
}

export function buildComponentDriftEntry(
  specName: string,
  direction: 'push' | 'pull' | 'conflict',
  figma: ComponentComparable | null,
  repo: ComponentComparable | null,
  snapshot: ComponentComparable | null,
): ComponentDriftEntry {
  let diff: ComponentDiff | null = null;
  if (figma !== null && repo !== null) {
    diff = buildComponentDiff(figma, repo);
  } else if (figma !== null && snapshot !== null) {
    diff = buildComponentDiff(figma, snapshot);
  } else if (repo !== null && snapshot !== null) {
    diff = buildComponentDiff(repo, snapshot);
  }

  return {
    id: toComponentDriftId(specName),
    kind: 'component',
    direction: direction,
    figma: wrapPayload(figma, diff !== null ? diff : undefined),
    repo: wrapPayload(repo),
    lastSynced: wrapPayload(snapshot),
  };
}

export function detectComponentDrift(input: ComponentDriftDetectInput): ComponentDriftDetectResult {
  const keySet: Record<string, boolean> = {};
  for (const key of Object.keys(input.repoSpecs)) {
    keySet[key] = true;
  }
  for (const key of Object.keys(input.figmaComponents)) {
    keySet[key] = true;
  }
  for (const key of Object.keys(input.snapshotComponents)) {
    keySet[key] = true;
  }

  const equalFn =
    input.options?.quickDetect === true
      ? componentHashEqual
      : componentComparableEqual;

  const drifts: ComponentDriftEntry[] = [];
  let syncedCount = 0;

  for (const specName of Object.keys(keySet)) {
    const figmaValue =
      input.figmaComponents[specName] !== undefined ? input.figmaComponents[specName] : null;
    const repoValue = input.repoSpecs[specName] !== undefined ? input.repoSpecs[specName] : null;
    const snapshotValue =
      input.snapshotComponents[specName] !== undefined ? input.snapshotComponents[specName] : null;

    if (figmaValue === null && repoValue === null && snapshotValue === null) {
      continue;
    }

    const direction = classifyThreeWay(figmaValue, repoValue, snapshotValue, equalFn);
    if (isSynced(direction)) {
      syncedCount += 1;
      continue;
    }

    drifts.push(buildComponentDriftEntry(specName, direction, figmaValue, repoValue, snapshotValue));
  }

  return {
    drifts: drifts,
    syncedCount: syncedCount,
  };
}
