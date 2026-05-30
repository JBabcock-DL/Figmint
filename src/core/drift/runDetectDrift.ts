/// <reference types="@figma/plugin-typings" />

import type { ComponentSpecV1, DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import { readFigmaVariableState } from '@/core/audit/readFigmaVariableState';
import { pluginLog } from '@/core/pluginLog';

import {
  buildRepoSpecMap,
  detectComponentDrift,
  detectVariableDrift,
  flattenFigmaVariableSnapshots,
  flattenRepoTokens,
  readSnapshotComponentComparables,
  readVariableSnapshotTokens,
} from '@/core/drift';
import {
  readVariableSnapshotSources,
  reconcilePrematurePushSnapshotKeys,
} from '@/core/drift/snapshotReconcile';
import { collectFigmaComponentComparablesFromSnapshot } from '@/core/drift/detectOrchestration';
import { buildDriftReport } from './report';
import { buildDriftReportMeta } from './reportMeta';

export interface RunDetectDriftInput {
  repoTokens: TokensV1;
  repoSpecs: { name: string; spec: ComponentSpecV1 }[];
  repoUrl: string;
  quickDetect?: boolean;
}

export async function runDetectDrift(input: RunDetectDriftInput): Promise<DriftReportV1> {
  const figmaCollections = await readFigmaVariableState();
  const figmaTokens = flattenFigmaVariableSnapshots(figmaCollections, { resolveAliases: true });
  const repoTokens = flattenRepoTokens(input.repoTokens);
  reconcilePrematurePushSnapshotKeys(figmaTokens, repoTokens);
  const variableResult = detectVariableDrift({
    repoTokens: repoTokens,
    figmaTokens: figmaTokens,
    snapshotTokens: readVariableSnapshotTokens(),
    snapshotSources: readVariableSnapshotSources(),
  });

  const repoMap = buildRepoSpecMap(input.repoSpecs);
  const snapshotComponents = readSnapshotComponentComparables();
  const keySet: Record<string, boolean> = {};
  for (const key of Object.keys(repoMap)) {
    keySet[key] = true;
  }
  for (const key of Object.keys(snapshotComponents)) {
    keySet[key] = true;
  }
  const figmaComponents = collectFigmaComponentComparablesFromSnapshot(keySet);
  for (const key of Object.keys(figmaComponents)) {
    keySet[key] = true;
  }

  const componentResult = detectComponentDrift({
    repoSpecs: repoMap,
    figmaComponents: figmaComponents,
    snapshotComponents: snapshotComponents,
    options: input.quickDetect === true ? { quickDetect: true } : undefined,
  });

  const syncedCount = variableResult.syncedCount + componentResult.syncedCount;
  const report = buildDriftReport({
    variableDrifts: variableResult.drifts,
    componentDrifts: componentResult.drifts,
    meta: buildDriftReportMeta(input.repoUrl),
    syncedCount: syncedCount,
  });

  pluginLog(
    '[drift] build-report',
    String(report.summary.push) + ' push',
    String(report.summary.pull) + ' pull',
    String(report.summary.conflict) + ' conflict',
    String(report.summary.synced) + ' synced',
  );

  const primaryDrift = report.drifts.find(function (entry) {
    return entry.id === 'var/Primitives/color/primary/50';
  });
  if (primaryDrift !== undefined) {
    pluginLog('[drift] primary/50 still drifts', primaryDrift.direction);
  }

  return report;
}
