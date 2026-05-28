/// <reference types="@figma/plugin-typings" />

import type {
  CollectionId,
  ThemeExtension,
  Token as TokenV1,
  TokenAliasRef,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

import { buildFigmaVariableStateFromLocalSnapshot } from '../audit/readFigmaVariableState';
import { pluginLog } from '../pluginLog';
import { runAudit } from '../audit/runAudit';
import type { FigmaCollectionSnapshot } from '../audit/types';

import { applyCodeSyntax, mapCodeSyntax } from './codeSyntax';
import { type ResolvedModeValues, shouldSkipVariable } from './compare';
import { COLLECTION_ORDER, ensureCollections } from './collections';
import { isEnterprise } from './detectPlan';
import { ensureModes } from './modes';
import { sortTokensForPush } from './resolveTokens';
import {
  createEmptyVarMaps,
  isTokenAliasRef,
  type CollectionPassResult,
  type LocalVariableSnapshot,
  type PushError,
  type PushOptions,
  type PushResult,
  type VarMaps,
} from './types';

export async function loadLocalVariableSnapshot(): Promise<LocalVariableSnapshot> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();

  const collectionByName = new Map<string, VariableCollection>();
  for (const collection of collections) {
    collectionByName.set(collection.name, collection);
  }

  const variableByKey = new Map<string, Variable>();
  for (const variable of variables) {
    const key = variable.variableCollectionId + ':' + variable.name;
    variableByKey.set(key, variable);
  }

  return {
    collectionByName,
    variableByKey,
    collections: collections.slice(),
    variables: variables.slice(),
  };
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as Record<'message', unknown>).message;
    return String(message);
  }
  return String(error);
}

export function resolveAliasAtPush(
  ref: TokenAliasRef,
  collections: Map<CollectionId, VariableCollection>,
  snapshot: LocalVariableSnapshot,
  varMap: VarMaps,
  collectionId: CollectionId,
  tokenName: string,
  errors: PushError[],
): VariableAlias | null {
  const targetCollection = collections.get(ref.aliasOf.collection);
  if (targetCollection) {
    const targetKey = targetCollection.id + ':' + ref.aliasOf.name;
    const targetVariable = snapshot.variableByKey.get(targetKey);
    if (targetVariable && typeof figma.variables.createVariableAlias === 'function') {
      return figma.variables.createVariableAlias(targetVariable);
    }
  }

  const bucket = varMap[ref.aliasOf.collection];
  const id = bucket[ref.aliasOf.name];
  if (!id) {
    errors.push({
      collection: collectionId,
      name: tokenName,
      phase: 'alias',
      message: 'Unresolved alias: ' + ref.aliasOf.collection + ':' + ref.aliasOf.name,
    });
    return null;
  }
  return { type: 'VARIABLE_ALIAS', id: id };
}

function resolveModeValues(
  token: TokenV1,
  modeMap: Record<string, string>,
  collections: Map<CollectionId, VariableCollection>,
  snapshot: LocalVariableSnapshot,
  varMap: VarMaps,
  errors: PushError[],
): ResolvedModeValues {
  const resolved: ResolvedModeValues = {};
  const values = token.valuesByMode as Record<string, unknown>;

  for (const modeName of Object.keys(values)) {
    if (!modeMap[modeName]) {
      continue;
    }
    const raw = values[modeName];
    if (isTokenAliasRef(raw)) {
      const alias = resolveAliasAtPush(
        raw,
        collections,
        snapshot,
        varMap,
        token.collection,
        token.name,
        errors,
      );
      if (alias) {
        resolved[modeName] = alias;
      }
    } else {
      resolved[modeName] = raw as VariableValue;
    }
  }

  return resolved;
}

function registerVariable(
  snapshot: LocalVariableSnapshot,
  collection: VariableCollection,
  variable: Variable,
): void {
  const key = collection.id + ':' + variable.name;
  snapshot.variableByKey.set(key, variable);
  snapshot.variables.push(variable);
}

function applyScopes(variable: Variable, token: TokenV1): void {
  try {
    if (token.scopes && token.scopes.length > 0) {
      variable.scopes = token.scopes.slice() as VariableScope[];
      return;
    }
    variable.scopes = ['ALL_SCOPES'];
  } catch (error) {
    pluginLog('[push] applyScopes failed', variable.name, extractErrorMessage(error));
  }
}

export function pushCollectionPass(
  collectionId: CollectionId,
  tokens: TokensV1,
  collections: Map<CollectionId, VariableCollection>,
  modeMaps: Record<CollectionId, Record<string, string>>,
  snapshot: LocalVariableSnapshot,
  varMap: VarMaps,
): CollectionPassResult {
  const started = Date.now();
  const pass: CollectionPassResult = {
    collection: collectionId,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const collection = collections.get(collectionId);
  if (!collection) {
    pass.errors.push({
      collection: collectionId,
      name: '',
      phase: 'collection',
      message: 'Collection missing after ensureCollections',
    });
    pass.durationMs = Date.now() - started;
    return pass;
  }

  const modeMap = modeMaps[collectionId];
  const orderedTokens = sortTokensForPush(Array.from(tokens.tokens), collectionId);

  for (const token of orderedTokens) {
    try {
      const desiredValues = resolveModeValues(
        token,
        modeMap,
        collections,
        snapshot,
        varMap,
        pass.errors,
      );
      const desiredCodeSyntax = mapCodeSyntax(token);
      const key = collection.id + ':' + token.name;
      let variable = snapshot.variableByKey.get(key);
      let isNew = false;

      if (variable) {
        if (variable.resolvedType !== token.type) {
          pass.errors.push({
            collection: collectionId,
            name: token.name,
            phase: 'variable',
            message: 'Type mismatch: existing ' + variable.resolvedType + ', desired ' + token.type,
          });
          continue;
        }
      } else {
        variable = figma.variables.createVariable(token.name, collection, token.type);
        registerVariable(snapshot, collection, variable);
        isNew = true;
      }

      let shouldSkip = false;
      if (!isNew) {
        try {
          shouldSkip = shouldSkipVariable(
            variable,
            token,
            modeMap,
            desiredValues,
            desiredCodeSyntax,
          );
        } catch (skipError) {
          pluginLog('[push] shouldSkipVariable failed', token.name, extractErrorMessage(skipError));
          shouldSkip = false;
        }
      }

      if (shouldSkip) {
        pass.skipped += 1;
        varMap[collectionId][token.name] = variable.id;
        continue;
      }

      applyScopes(variable, token);

      for (const modeName of Object.keys(desiredValues)) {
        const modeId = modeMap[modeName];
        const value = desiredValues[modeName];
        if (modeId) {
          variable.setValueForMode(modeId, value);
        }
      }

      applyCodeSyntax(variable, token);

      varMap[collectionId][token.name] = variable.id;

      if (isNew) {
        pass.created += 1;
      } else {
        pass.updated += 1;
      }
    } catch (error) {
      pass.errors.push({
        collection: collectionId,
        name: token.name,
        phase: 'variable',
        message: extractErrorMessage(error),
      });
    }
  }

  pass.durationMs = Date.now() - started;
  return pass;
}

function buildExtendedModeMap(
  parentCollection: VariableCollection,
  extendedCollection: ExtendedVariableCollection,
): Record<string, string> {
  const parentModeNameById: Record<string, string> = {};
  for (const mode of parentCollection.modes) {
    parentModeNameById[mode.modeId] = mode.name;
  }

  const extendedModeByParentName: Record<string, string> = {};
  for (const mode of extendedCollection.modes) {
    if (mode.parentModeId) {
      const parentName = parentModeNameById[mode.parentModeId];
      if (parentName) {
        extendedModeByParentName[parentName] = mode.modeId;
      }
    }
  }

  return extendedModeByParentName;
}

function pushEvcProjections(
  themes: readonly ThemeExtension[],
  collections: Map<CollectionId, VariableCollection>,
  snapshot: LocalVariableSnapshot,
  varMap: VarMaps,
  errors: PushError[],
): { extensionsCreated: number; overridesApplied: number; skipped: number } {
  let extensionsCreated = 0;
  let overridesApplied = 0;
  let skipped = 0;

  for (const themeExt of themes) {
    const parent = collections.get(themeExt.parentCollection);
    if (!parent) {
      errors.push({
        collection: themeExt.parentCollection,
        name: themeExt.name,
        phase: 'evc',
        message: 'Parent collection missing for EVC extension',
      });
      continue;
    }

    try {
      const extended = parent.extend(themeExt.name);
      extensionsCreated += 1;

      const extendedModeMap = buildExtendedModeMap(parent, extended);

      for (const override of themeExt.overrides) {
        const variableKey = parent.id + ':' + override.name;
        const variable = snapshot.variableByKey.get(variableKey);
        if (!variable) {
          errors.push({
            collection: themeExt.parentCollection,
            name: override.name,
            phase: 'evc',
            message: 'Override target variable not found: ' + override.name,
          });
          continue;
        }

        const values = override.valuesByMode as Record<string, unknown>;
        for (const modeName of Object.keys(values)) {
          const extModeId = extendedModeMap[modeName];
          if (!extModeId) {
            skipped += 1;
            continue;
          }

          const raw = values[modeName];
          let resolved: VariableValue | null = null;
          if (isTokenAliasRef(raw)) {
            const alias = resolveAliasAtPush(
              raw,
              collections,
              snapshot,
              varMap,
              themeExt.parentCollection,
              override.name,
              errors,
            );
            resolved = alias;
          } else {
            resolved = raw as VariableValue;
          }

          if (resolved !== null) {
            variable.setValueForMode(extModeId, resolved);
            overridesApplied += 1;
          }
        }
      }
    } catch (error) {
      errors.push({
        collection: themeExt.parentCollection,
        name: themeExt.name,
        phase: 'evc',
        message: extractErrorMessage(error),
      });
    }
  }

  return { extensionsCreated, overridesApplied, skipped };
}

function mergePassResult(result: PushResult, pass: CollectionPassResult): void {
  result.created += pass.created;
  result.updated += pass.updated;
  result.skipped += pass.skipped;
  result.errors = result.errors.concat(pass.errors);
  result.passes.push(pass);
}

/**
 * Phase-tagged wrapper so an unexpected throw surfaces *which* push phase failed
 * (e.g. `snapshot`, `ensureCollections`, `commitUndo`, `auditRead`) instead of a
 * bare `TypeError: not a function`. Use only for phases not already covered by an
 * inner try/catch.
 */
async function runPhase<T>(phase: string, fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const inner = extractErrorMessage(error);
    const wrapped = new Error('[' + phase + '] ' + inner);
    if (error instanceof Error && error.stack) {
      wrapped.stack = error.stack;
    }
    pluginLog('[push] phase failed', phase, inner);
    throw wrapped;
  }
}

export async function pushTokens(
  tokens: TokensV1,
  options?: PushOptions,
): Promise<PushResult & { audit: import('@detroitlabs/fighub-contracts').AuditReportV1 }> {
  const started = Date.now();
  const continueOnAuditFail =
    options !== undefined && options.continueOnAuditFail !== undefined
      ? options.continueOnAuditFail
      : false;
  const evcEnabled = options !== undefined && options.evcEnabled === true;

  const result: PushResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    passes: [],
    totalDurationMs: 0,
  };

  const snapshot = await runPhase('snapshot', () => loadLocalVariableSnapshot());
  const { collections } = await runPhase('ensureCollections', () => ensureCollections(snapshot));
  const modeMaps = await runPhase('ensureModes', () => ensureModes(collections, tokens));
  const varMap = createEmptyVarMaps();

  for (const collectionId of COLLECTION_ORDER) {
    const pass = await runPhase('pass:' + collectionId, () =>
      pushCollectionPass(collectionId, tokens, collections, modeMaps, snapshot, varMap),
    );
    mergePassResult(result, pass);
  }

  if (evcEnabled && tokens.themes && tokens.themes.length > 0) {
    const themes = tokens.themes;
    const enterprise = await runPhase('evcDetect', () => isEnterprise());
    if (enterprise) {
      const evcStats = await runPhase('evcProjections', () =>
        pushEvcProjections(themes, collections, snapshot, varMap, result.errors),
      );
      result.evc = evcStats;
    }
  }

  try {
    figma.commitUndo();
  } catch (commitError) {
    const commitMessage = extractErrorMessage(commitError);
    pluginLog('[push] commitUndo failed', commitMessage);
    result.errors.push({
      collection: 'primitives',
      name: '',
      phase: 'variable',
      message: 'commitUndo failed: ' + commitMessage,
    });
  }

  let figmaCollections: FigmaCollectionSnapshot[] = [];
  try {
    figmaCollections = buildFigmaVariableStateFromLocalSnapshot(snapshot);
  } catch (auditReadError) {
    const auditReadMessage = extractErrorMessage(auditReadError);
    pluginLog('[push] buildFigmaVariableStateFromLocalSnapshot failed', auditReadMessage);
    result.errors.push({
      collection: 'primitives',
      name: '',
      phase: 'variable',
      message: 'Post-push audit snapshot failed: ' + auditReadMessage,
    });
  }

  const auditReport = await runPhase('runAudit', () =>
    runAudit('variables', {
      canonical: tokens,
      pushResult: result,
      figmaCollections,
    }),
  );
  if (!auditReport.passed && !continueOnAuditFail) {
    for (const ruleResult of auditReport.results) {
      if (!ruleResult.pass && ruleResult.severity !== 'warn') {
        result.errors.push({
          collection: 'theme',
          name: '',
          phase: 'variable',
          message: 'Audit: ' + ruleResult.ruleId + ' — ' + ruleResult.diagnostic,
        });
      }
    }
  }

  result.totalDurationMs = Date.now() - started;
  return { ...result, audit: auditReport };
}
