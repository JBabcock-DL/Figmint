/// <reference types="@figma/plugin-typings" />

import type {
  ComponentDriftEntry,
  ComponentSpecV1,
  DriftReportV1,
  TokensV1,
  VariableDriftEntry,
} from '@detroitlabs/fighub-contracts';

import { runScaffoldComponent } from '@/core/components/scaffold/runScaffold';
import { pushTokens } from '@/core/variables';
import { updateSnapshotKeys } from '@/core/sync/snapshotStore';

import { effectiveResolutionDirection, variableComparableToToken } from './applyPushResolutions';
import { parseVariableDriftId } from './variableKeys';
import type { ComponentComparable, VariableComparable } from './types';
import type { ResolutionChoice } from '@/io/messages/drift';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractVariableComparable(payload: unknown): VariableComparable | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.comparable)) {
    return payload.comparable as unknown as VariableComparable;
  }
  if (typeof payload.resolvedType === 'string' && isRecord(payload.valuesByMode)) {
    return payload as unknown as VariableComparable;
  }
  return null;
}

function extractComponentComparable(payload: unknown): ComponentComparable | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.comparable)) {
    return payload.comparable as unknown as ComponentComparable;
  }
  if (typeof payload.specName === 'string') {
    return payload as unknown as ComponentComparable;
  }
  return null;
}

export function buildTokensFromVariablePullDrifts(drifts: VariableDriftEntry[]): TokensV1 {
  const tokens: Token[] = [];
  const collectionModes: Record<string, Set<string>> = {};

  for (let i = 0; i < drifts.length; i++) {
    const drift = drifts[i];
    const parsed = parseVariableDriftId(drift.id);
    const comparable = extractVariableComparable(drift.repo);
    if (parsed === null || comparable === null) {
      continue;
    }
    const token = variableComparableToToken(parsed.collectionName, parsed.variableName, comparable);
    if (token === null) {
      continue;
    }
    tokens.push(token);
    if (collectionModes[token.collection] === undefined) {
      collectionModes[token.collection] = new Set<string>();
    }
    for (const modeName of Object.keys(token.valuesByMode)) {
      collectionModes[token.collection].add(modeName);
    }
  }

  const collections: TokensV1['collections'][number][] = [];
  for (const collectionId of Object.keys(collectionModes)) {
    collections.push({
      id: collectionId as TokensV1['collections'][number]['id'],
      modes: Array.from(collectionModes[collectionId]),
    });
  }

  return {
    v: 1,
    kind: 'tokens',
    collections: collections,
    tokens: tokens,
  };
}

export async function applyVariablePullDrifts(drifts: VariableDriftEntry[]): Promise<number> {
  if (drifts.length === 0) {
    return 0;
  }
  const tokensDoc = buildTokensFromVariablePullDrifts(drifts);
  if (tokensDoc.tokens.length === 0) {
    return 0;
  }
  await pushTokens(tokensDoc);
  return tokensDoc.tokens.length;
}

export async function applyComponentPullDrifts(
  drifts: ComponentDriftEntry[],
  repoSpecs: Record<string, ComponentSpecV1>,
): Promise<number> {
  let applied = 0;
  for (let i = 0; i < drifts.length; i++) {
    const drift = drifts[i];
    const comparable = extractComponentComparable(drift.repo);
    const specName =
      comparable !== null
        ? comparable.specName
        : drift.id.startsWith('cmp/')
          ? drift.id.slice('cmp/'.length)
          : '';
    const spec = repoSpecs[specName];
    if (spec === undefined) {
      continue;
    }
    await runScaffoldComponent(spec);
    applied += 1;
  }
  return applied;
}

export function collectPullDrifts(
  report: DriftReportV1,
  resolutions: Record<string, ResolutionChoice>,
  driftIds: string[],
): { variables: VariableDriftEntry[]; components: ComponentDriftEntry[] } {
  const variables: VariableDriftEntry[] = [];
  const components: ComponentDriftEntry[] = [];
  for (let i = 0; i < driftIds.length; i++) {
    const driftId = driftIds[i];
    for (let j = 0; j < report.drifts.length; j++) {
      const drift = report.drifts[j];
      if (drift.id !== driftId) {
        continue;
      }
      if (effectiveResolutionDirection(drift, resolutions) !== 'pull') {
        break;
      }
      if (drift.kind === 'variable') {
        variables.push(drift);
      } else {
        components.push(drift);
      }
      break;
    }
  }
  return { variables: variables, components: components };
}

export function snapshotKeysForPullDrifts(
  report: DriftReportV1,
  resolutions: Record<string, ResolutionChoice>,
  driftIds: string[],
): { key: string; value: unknown }[] {
  const keys: { key: string; value: unknown }[] = [];
  for (let i = 0; i < driftIds.length; i++) {
    const driftId = driftIds[i];
    for (let j = 0; j < report.drifts.length; j++) {
      const drift = report.drifts[j];
      if (drift.id !== driftId) {
        continue;
      }
      if (effectiveResolutionDirection(drift, resolutions) !== 'pull') {
        break;
      }
      if (drift.kind === 'variable') {
        const comparable = extractVariableComparable(drift.repo);
        if (comparable !== null) {
          keys.push({ key: drift.id, value: comparable });
        }
      } else {
        const comparable = extractComponentComparable(drift.repo);
        if (comparable !== null) {
          keys.push({ key: drift.id, value: comparable });
        }
      }
      break;
    }
  }
  return keys;
}

export async function applyPullResolutions(input: {
  report: DriftReportV1;
  resolutions: Record<string, ResolutionChoice>;
  driftIds: string[];
  repoSpecs: Record<string, ComponentSpecV1>;
}): Promise<number> {
  const partitioned = collectPullDrifts(input.report, input.resolutions, input.driftIds);
  let applied = 0;
  applied += await applyVariablePullDrifts(partitioned.variables);
  applied += await applyComponentPullDrifts(partitioned.components, input.repoSpecs);

  const snapshotKeys = snapshotKeysForPullDrifts(input.report, input.resolutions, input.driftIds);
  if (snapshotKeys.length > 0) {
    updateSnapshotKeys(
      snapshotKeys.map(function (entry) {
        return {
          key: entry.key,
          value: entry.value,
          source: 'pull' as const,
        };
      }),
    );
  }
  return applied;
}
