import type { CodeSyntaxPlatform, Token as TokenV1 } from '@detroitlabs/figmint-contracts';

import { isTokenAliasRef } from './types';

const COLOR_EPSILON = 1e-4;
const CODE_SYNTAX_PLATFORMS: CodeSyntaxPlatform[] = ['WEB', 'ANDROID', 'iOS'];

export type ResolvedModeValues = Record<string, VariableValue>;

function isColorValue(value: unknown): value is RGBA {
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

function isVariableAlias(value: unknown): value is VariableAlias {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.type === 'VARIABLE_ALIAS' && typeof record.id === 'string';
}

export function valuesEqual(
  current: VariableValue,
  desired: VariableValue,
  epsilon?: number,
): boolean {
  const tolerance = epsilon !== undefined ? epsilon : COLOR_EPSILON;

  if (isVariableAlias(current) && isVariableAlias(desired)) {
    return current.id === desired.id;
  }

  if (isColorValue(current) && isColorValue(desired)) {
    return (
      Math.abs(current.r - desired.r) <= tolerance &&
      Math.abs(current.g - desired.g) <= tolerance &&
      Math.abs(current.b - desired.b) <= tolerance &&
      Math.abs(current.a - desired.a) <= tolerance
    );
  }

  return current === desired;
}

export function codeSyntaxEqual(
  variable: Variable,
  desiredTriple: Partial<Record<CodeSyntaxPlatform, string>>,
): boolean {
  for (const platform of CODE_SYNTAX_PLATFORMS) {
    const desired = desiredTriple[platform];
    if (desired === undefined) {
      continue;
    }
    const current = variable.codeSyntax[platform];
    const currentValue = current !== undefined ? current : '';
    if (currentValue !== desired) {
      return false;
    }
  }
  return true;
}

export function shouldSkipVariable(
  variable: Variable,
  token: TokenV1,
  modeMap: Record<string, string>,
  desiredValues: ResolvedModeValues,
  desiredCodeSyntax: Partial<Record<CodeSyntaxPlatform, string>>,
): boolean {
  for (const modeName of Object.keys(token.valuesByMode)) {
    const modeId = modeMap[modeName];
    if (!modeId) {
      return false;
    }
    const current = variable.valuesByMode[modeId];
    const desired = desiredValues[modeName];
    if (!valuesEqual(current, desired)) {
      return false;
    }
  }

  if (!codeSyntaxEqual(variable, desiredCodeSyntax)) {
    return false;
  }

  return true;
}

export function resolveTokenValueForCompare(
  raw: unknown,
  resolveAlias: (ref: { aliasOf: { collection: string; name: string } }) => VariableValue | null,
): VariableValue | null {
  if (isTokenAliasRef(raw)) {
    return resolveAlias(raw);
  }
  return raw as VariableValue;
}
