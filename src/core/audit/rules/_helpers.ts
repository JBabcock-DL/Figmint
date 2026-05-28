/// <reference types="@figma/plugin-typings" />

import type { CollectionId, ColorValue, Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import { CODE_SYNTAX_PLATFORMS, COLLECTION_DISPLAY_NAMES, COLOR_EPSILON } from '../constants';
import type { FigmaCollectionSnapshot, FigmaVariableSnapshot } from '../types';

export function tokenKey(collection: CollectionId, name: string): string {
  return collection + ':' + name;
}

export function indexCanonicalTokens(canonical: TokensV1): Map<string, Token> {
  const index = new Map<string, Token>();
  for (const token of canonical.tokens) {
    index.set(tokenKey(token.collection, token.name), token);
  }
  return index;
}

export function findFigmaCollectionByDisplayName(
  figmaCollections: FigmaCollectionSnapshot[],
  collectionId: CollectionId,
): FigmaCollectionSnapshot | undefined {
  const displayName = COLLECTION_DISPLAY_NAMES[collectionId];
  for (const collection of figmaCollections) {
    if (collection.name === displayName) {
      return collection;
    }
  }
  return undefined;
}

export function findFigmaVariable(
  figmaCollections: FigmaCollectionSnapshot[],
  collectionId: CollectionId,
  name: string,
): FigmaVariableSnapshot | undefined {
  const collection = findFigmaCollectionByDisplayName(figmaCollections, collectionId);
  if (!collection) {
    return undefined;
  }
  for (const variable of collection.variables) {
    if (variable.name === name) {
      return variable;
    }
  }
  return undefined;
}

export function getCanonicalCollectionModes(
  canonical: TokensV1,
  collectionId: CollectionId,
): string[] {
  for (const collection of canonical.collections) {
    if (collection.id === collectionId) {
      return collection.modes.slice();
    }
  }
  return [];
}

export function isEmptyValue(value: VariableValue | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  if (isVariableAlias(value)) {
    return value.id === '';
  }
  return false;
}

function isVariableAlias(value: VariableValue): value is VariableAlias {
  return typeof value === 'object' && 'type' in value;
}

export function buildVariableIndex(
  figmaCollections: FigmaCollectionSnapshot[],
): Map<string, FigmaVariableSnapshot> {
  const index = new Map<string, FigmaVariableSnapshot>();
  for (const collection of figmaCollections) {
    for (const variable of collection.variables) {
      index.set(variable.id, variable);
    }
  }
  return index;
}

export function resolveFigmaValue(
  value: VariableValue | undefined,
  modeName: string,
  variablesById: Map<string, FigmaVariableSnapshot>,
  stack: string[],
): VariableValue | null {
  if (value === undefined) {
    return null;
  }
  if (isVariableAlias(value)) {
    if (stack.includes(value.id)) {
      return null;
    }
    const target = variablesById.get(value.id);
    if (!target) {
      return null;
    }
    const nextStack = stack.concat(value.id);
    let modeValue: VariableValue | undefined;
    if (Object.prototype.hasOwnProperty.call(target.valuesByMode, modeName)) {
      modeValue = target.valuesByMode[modeName];
    }
    if (modeValue === undefined) {
      const modeNames = Object.keys(target.valuesByMode);
      if (modeNames.length === 0) {
        return null;
      }
      return resolveFigmaValue(
        target.valuesByMode[modeNames[0]],
        modeNames[0],
        variablesById,
        nextStack,
      );
    }
    return resolveFigmaValue(modeValue, modeName, variablesById, nextStack);
  }
  return value;
}

export function colorsEqual(a: ColorValue, b: ColorValue): boolean {
  return (
    Math.abs(a.r - b.r) <= COLOR_EPSILON &&
    Math.abs(a.g - b.g) <= COLOR_EPSILON &&
    Math.abs(a.b - b.b) <= COLOR_EPSILON &&
    Math.abs(a.a - b.a) <= COLOR_EPSILON
  );
}

export function isColorValue(value: unknown): value is ColorValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.r === 'number' &&
    typeof record.g === 'number' &&
    typeof record.b === 'number' &&
    typeof record.a === 'number'
  );
}

export function valuesEqual(expected: unknown, actual: VariableValue | null): boolean {
  if (actual === null) {
    return false;
  }
  if (isColorValue(expected) && isColorValue(actual)) {
    return colorsEqual(expected, actual);
  }
  return expected === actual;
}

export function scanCodeSyntaxCoverage(
  figmaCollections: FigmaCollectionSnapshot[],
): Record<'WEB' | 'ANDROID' | 'iOS', { expected: number; missing: number }> {
  const coverage: Record<'WEB' | 'ANDROID' | 'iOS', { expected: number; missing: number }> = {
    WEB: { expected: 0, missing: 0 },
    ANDROID: { expected: 0, missing: 0 },
    iOS: { expected: 0, missing: 0 },
  };

  for (const collection of figmaCollections) {
    for (const variable of collection.variables) {
      for (const platform of CODE_SYNTAX_PLATFORMS) {
        coverage[platform].expected += 1;
        const value = variable.codeSyntax[platform];
        if (value === undefined || typeof value !== 'string' || value.trim() === '') {
          coverage[platform].missing += 1;
        }
      }
    }
  }

  return coverage;
}

export function scanModeCoverage(
  canonical: TokensV1,
  figmaCollections: FigmaCollectionSnapshot[],
): Record<string, { expected: string[]; missing: string[] }> {
  const coverage: Record<string, { expected: string[]; missing: string[] }> = {};

  for (const collectionMeta of canonical.collections) {
    const collectionId = collectionMeta.id;
    const expectedModes = collectionMeta.modes.slice();
    const missingSet = new Set<string>();

    for (const token of canonical.tokens) {
      if (token.collection !== collectionId) {
        continue;
      }
      const figmaVar = findFigmaVariable(figmaCollections, collectionId, token.name);
      for (const modeName of expectedModes) {
        const canonicalHasMode = Object.prototype.hasOwnProperty.call(token.valuesByMode, modeName);
        if (!canonicalHasMode) {
          continue;
        }
        if (!figmaVar || isEmptyValue(figmaVar.valuesByMode[modeName])) {
          missingSet.add(modeName);
        }
      }
    }

    coverage[collectionId] = {
      expected: expectedModes,
      missing: Array.from(missingSet),
    };
  }

  return coverage;
}

export function isIosDotSegmentFormat(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }
  const segments = trimmed.replace(/^\./, '').split('.');
  for (const segment of segments) {
    if (segment === '') {
      return false;
    }
    if (/[a-z][A-Z]/.test(segment)) {
      return false;
    }
  }
  return true;
}

export function passResult(
  ruleId: string,
  diagnostic: string,
): import('@detroitlabs/fighub-contracts').AuditRuleResult {
  return { ruleId, pass: true, diagnostic, severity: 'error' };
}

export function failResult(
  ruleId: string,
  diagnostic: string,
): import('@detroitlabs/fighub-contracts').AuditRuleResult {
  return { ruleId, pass: false, diagnostic, severity: 'error' };
}
