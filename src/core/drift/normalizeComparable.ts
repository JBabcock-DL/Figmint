/// <reference types="@figma/plugin-typings" />

import type { CollectionId, Token } from '@detroitlabs/fighub-contracts';

import { mapCodeSyntax } from '@/core/variables/codeSyntax';

import type { VariableComparable } from './types';

const CODE_SYNTAX_PLATFORMS: ('WEB' | 'ANDROID' | 'iOS')[] = ['WEB', 'ANDROID', 'iOS'];

const COLLECTION_NAME_TO_ID: Record<string, CollectionId> = {
  Primitives: 'primitives',
  Theme: 'theme',
  Typography: 'typography',
  Layout: 'layout',
  Effects: 'effects',
};

function isColorValue(value: unknown): value is RGBA {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RGBA).r === 'number' &&
    typeof (value as RGBA).g === 'number' &&
    typeof (value as RGBA).b === 'number' &&
    typeof (value as RGBA).a === 'number'
  );
}

function isVariableAlias(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VariableAlias).type === 'VARIABLE_ALIAS' &&
    typeof (value as VariableAlias).id === 'string'
  );
}

/** Snap COLOR floats to 8-bit channels so hex repo values and Figma-native floats compare 1:1. */
export function normalizeVariableValue(value: VariableValue): VariableValue {
  if (isVariableAlias(value)) {
    return value;
  }
  if (!isColorValue(value)) {
    return value;
  }
  return {
    r: Math.round(value.r * 255) / 255,
    g: Math.round(value.g * 255) / 255,
    b: Math.round(value.b * 255) / 255,
    a: Math.round(value.a * 255) / 255,
  };
}

function trimCodeSyntax(
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
): Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> {
  const result: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> = {};
  for (let i = 0; i < CODE_SYNTAX_PLATFORMS.length; i++) {
    const platform = CODE_SYNTAX_PLATFORMS[i];
    const value = codeSyntax[platform];
    if (value !== undefined && value.trim().length > 0) {
      result[platform] = value.trim();
    }
  }
  return result;
}

function codeSyntaxFromToken(token: Token): Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> {
  return trimCodeSyntax(mapCodeSyntax(token));
}

function codeSyntaxFromFigmaVariable(
  collectionName: string,
  variableName: string,
  resolvedType: VariableResolvedDataType,
  readSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
): Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> {
  const collectionId = COLLECTION_NAME_TO_ID[collectionName];
  if (collectionId === undefined) {
    return trimCodeSyntax(readSyntax);
  }
  const mapped = codeSyntaxFromToken({
    collection: collectionId,
    name: variableName,
    type: resolvedType,
    valuesByMode: { Default: 0 },
  } as Token);
  const merged: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> = {};
  for (let i = 0; i < CODE_SYNTAX_PLATFORMS.length; i++) {
    const platform = CODE_SYNTAX_PLATFORMS[i];
    const read = readSyntax[platform]?.trim();
    if (read !== undefined && read.length > 0) {
      merged[platform] = read;
    } else if (mapped[platform] !== undefined) {
      merged[platform] = mapped[platform];
    }
  }
  return merged;
}

export function normalizeVariableComparable(
  comparable: VariableComparable,
  options?: {
    collectionName?: string;
    variableName?: string;
    token?: Token;
  },
): VariableComparable {
  const normalizedValues: Record<string, VariableValue> = {};
  for (const modeName of Object.keys(comparable.valuesByMode)) {
    normalizedValues[modeName] = normalizeVariableValue(comparable.valuesByMode[modeName]);
  }

  let codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
  if (options?.token !== undefined) {
    codeSyntax = codeSyntaxFromToken(options.token);
  } else if (
    options?.collectionName !== undefined &&
    options?.variableName !== undefined
  ) {
    codeSyntax = codeSyntaxFromFigmaVariable(
      options.collectionName,
      options.variableName,
      comparable.resolvedType,
      comparable.codeSyntax,
    );
  } else {
    codeSyntax = trimCodeSyntax(comparable.codeSyntax);
  }

  return {
    resolvedType: comparable.resolvedType,
    valuesByMode: normalizedValues,
    codeSyntax: codeSyntax,
  };
}
