import type {
  CollectionId,
  ComponentSpecV1,
  DriftEntry,
  DriftReportV1,
  Token,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

import { kebabCase } from './componentKeys';
import type { ComponentComparable, VariableComparable } from './types';
import { parseVariableDriftId } from './variableKeys';
import type { ResolutionChoice } from '@/io/messages/drift';
import {
  serializeTokensForRepo,
  type RepoTokensWireFormat,
} from '@/io/sources/adapters/serializeTokensWire';

const COLLECTION_NAME_TO_ID: Record<string, CollectionId> = {
  Primitives: 'primitives',
  Theme: 'theme',
  Typography: 'typography',
  Layout: 'layout',
  Effects: 'effects',
};

export interface PushCommitFile {
  path: string;
  content: string;
  format: 'json';
}

export interface BuildPushCommitFilesInput {
  report: DriftReportV1;
  resolutions: Record<string, ResolutionChoice>;
  driftIds: string[];
  baseTokens: TokensV1;
  tokensPath: string;
  specsPath: string;
  repoSpecs?: Record<string, ComponentSpecV1>;
  tokensWireFormat?: RepoTokensWireFormat;
}

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
  if (typeof payload.specName === 'string' && typeof payload.variantMatrixHash === 'string') {
    return payload as unknown as ComponentComparable;
  }
  return null;
}

function findDriftInReport(report: DriftReportV1, driftId: string): DriftEntry | null {
  for (let i = 0; i < report.drifts.length; i++) {
    if (report.drifts[i].id === driftId) {
      return report.drifts[i];
    }
  }
  return null;
}

/** Bulk "Push selected → PR" treats checked push drifts as push; per-row Skip does not block. */
export function resolutionsForBulkPush(
  report: DriftReportV1,
  resolutions: Record<string, ResolutionChoice>,
  driftIds: string[],
): Record<string, ResolutionChoice> {
  const adjusted: Record<string, ResolutionChoice> = Object.assign({}, resolutions);
  for (let i = 0; i < driftIds.length; i++) {
    const driftId = driftIds[i];
    const drift = findDriftInReport(report, driftId);
    if (drift !== null && drift.direction === 'push' && adjusted[driftId]?.type === 'skip') {
      delete adjusted[driftId];
    }
  }
  return adjusted;
}

export function effectiveResolutionDirection(
  drift: DriftEntry,
  resolutions: Record<string, ResolutionChoice>,
): 'push' | 'pull' | 'skip' | null {
  const choice = resolutions[drift.id];
  if (choice?.type === 'skip') {
    return 'skip';
  }
  if (drift.direction === 'conflict') {
    if (choice !== undefined && (choice.type === 'push' || choice.type === 'pull')) {
      return choice.type;
    }
    return null;
  }
  if (drift.direction === 'push' || drift.direction === 'pull') {
    return drift.direction;
  }
  return null;
}

function resolvedTypeToTokenType(resolvedType: string): Token['type'] {
  if (resolvedType === 'COLOR') {
    return 'COLOR';
  }
  if (resolvedType === 'FLOAT') {
    return 'FLOAT';
  }
  if (resolvedType === 'STRING') {
    return 'STRING';
  }
  return 'BOOLEAN';
}

function coerceTokenModeValue(value: unknown): Token['valuesByMode'][string] | null {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (isRecord(value) && typeof value.r === 'number') {
    return {
      r: value.r,
      g: value.g as number,
      b: value.b as number,
      a: value.a as number,
    };
  }
  return null;
}

export function variableComparableToToken(
  collectionName: string,
  variableName: string,
  comparable: VariableComparable,
): Token | null {
  const collection = COLLECTION_NAME_TO_ID[collectionName];
  if (collection === undefined) {
    return null;
  }
  const valuesByMode: Token['valuesByMode'] = {};
  for (const modeName of Object.keys(comparable.valuesByMode)) {
    const coerced = coerceTokenModeValue(comparable.valuesByMode[modeName]);
    if (coerced === null) {
      return null;
    }
    valuesByMode[modeName] = coerced;
  }
  const tokenType = resolvedTypeToTokenType(comparable.resolvedType);
  const base = { collection: collection, name: variableName, valuesByMode: valuesByMode };
  const codeSyntax =
    Object.keys(comparable.codeSyntax).length > 0
      ? { codeSyntax: comparable.codeSyntax }
      : {};
  switch (tokenType) {
    case 'COLOR':
      return { ...base, type: 'COLOR', ...codeSyntax } as Token;
    case 'FLOAT':
      return { ...base, type: 'FLOAT', ...codeSyntax } as Token;
    case 'STRING':
      return { ...base, type: 'STRING', ...codeSyntax } as Token;
    case 'BOOLEAN':
      return { ...base, type: 'BOOLEAN', ...codeSyntax } as Token;
    default: {
      const _exhaustive: never = tokenType;
      return _exhaustive;
    }
  }
}

function tokenKey(token: Token): string {
  return token.collection + ':' + token.name;
}

export function mergeTokensForPush(baseTokens: TokensV1, pushTokensList: Token[]): TokensV1 {
  const tokenIndex = new Map<string, Token>();
  for (let i = 0; i < baseTokens.tokens.length; i++) {
    const token = baseTokens.tokens[i];
    tokenIndex.set(tokenKey(token), token);
  }
  for (let i = 0; i < pushTokensList.length; i++) {
    tokenIndex.set(tokenKey(pushTokensList[i]), pushTokensList[i]);
  }
  const mergedTokens: Token[] = [];
  for (const token of tokenIndex.values()) {
    mergedTokens.push(token);
  }
  return {
    v: 1,
    kind: 'tokens',
    collections: baseTokens.collections,
    tokens: mergedTokens,
  };
}

function comparableToSpec(
  comparable: ComponentComparable,
  baseSpec?: ComponentSpecV1,
): ComponentSpecV1 | null {
  if (baseSpec !== undefined) {
    return Object.assign({}, baseSpec, {
      variantMatrix:
        comparable.variantMatrix !== undefined ? comparable.variantMatrix : baseSpec.variantMatrix,
      props: comparable.props,
      bindings: comparable.bindings,
    });
  }
  if (comparable.variantMatrix === undefined) {
    return null;
  }
  return {
    v: 1,
    kind: 'component-spec',
    name: comparable.specName,
    framework: 'react',
    variantMatrix: comparable.variantMatrix,
    props: comparable.props,
    bindings: comparable.bindings,
    layout: {
      direction: 'horizontal',
      gap: '8',
      sizing: { horizontal: 'hug', vertical: 'hug' },
    },
  };
}

export function buildPushCommitFiles(input: BuildPushCommitFilesInput): PushCommitFile[] {
  const pushTokensList: Token[] = [];
  const componentFiles: PushCommitFile[] = [];
  const specsPath = input.specsPath.endsWith('/') ? input.specsPath : input.specsPath + '/';

  for (let i = 0; i < input.driftIds.length; i++) {
    const driftId = input.driftIds[i];
    let drift: DriftEntry | null = null;
    for (let j = 0; j < input.report.drifts.length; j++) {
      if (input.report.drifts[j].id === driftId) {
        drift = input.report.drifts[j];
        break;
      }
    }
    if (drift === null) {
      continue;
    }
    const direction = effectiveResolutionDirection(drift, input.resolutions);
    if (direction !== 'push') {
      continue;
    }

    if (drift.kind === 'variable') {
      const variableDrift = drift;
      const parsed = parseVariableDriftId(variableDrift.id);
      const comparable = extractVariableComparable(variableDrift.figma);
      if (parsed === null || comparable === null) {
        continue;
      }
      const token = variableComparableToToken(
        parsed.collectionName,
        parsed.variableName,
        comparable,
      );
      if (token !== null) {
        pushTokensList.push(token);
      }
    } else {
      const componentDrift = drift;
      const figmaComparable = extractComponentComparable(componentDrift.figma);
      if (figmaComparable === null) {
        continue;
      }
      const baseSpec =
        input.repoSpecs !== undefined ? input.repoSpecs[figmaComparable.specName] : undefined;
      const spec = comparableToSpec(figmaComparable, baseSpec);
      if (spec === null) {
        continue;
      }
      componentFiles.push({
        path: specsPath + kebabCase(spec.name) + '.json',
        content: JSON.stringify(spec, null, 2),
        format: 'json',
      });
    }
  }

  const files: PushCommitFile[] = [];
  if (pushTokensList.length > 0) {
    const merged = mergeTokensForPush(input.baseTokens, pushTokensList);
    const wireFormat = input.tokensWireFormat !== undefined ? input.tokensWireFormat : 'dtcg';
    files.push({
      path: input.tokensPath,
      content: serializeTokensForRepo(merged, wireFormat),
      format: 'json',
    });
  }
  for (let i = 0; i < componentFiles.length; i++) {
    files.push(componentFiles[i]);
  }
  return files;
}

export function snapshotKeysForPushDrifts(
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
      if (effectiveResolutionDirection(drift, resolutions) !== 'push') {
        break;
      }
      if (drift.kind === 'variable') {
        const comparable = extractVariableComparable(drift.figma);
        if (comparable !== null) {
          keys.push({ key: drift.id, value: comparable });
        }
      } else {
        const comparable = extractComponentComparable(drift.figma);
        if (comparable !== null) {
          keys.push({ key: drift.id, value: comparable });
        }
      }
      break;
    }
  }
  return keys;
}
