/// <reference types="@figma/plugin-typings" />

import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

import { pluginLog } from '../pluginLog';
import { deriveCodeSyntax } from './deriveCodeSyntax';
import { isPresent } from './deriveCodeSyntax/shared';

const PLATFORMS: readonly CodeSyntaxPlatform[] = ['WEB', 'ANDROID', 'iOS'];

function storedSyntax(token: CanonicalToken): Partial<Record<CodeSyntaxPlatform, string>> {
  const result: Partial<Record<CodeSyntaxPlatform, string>> = {};
  if (!token.codeSyntax) {
    return result;
  }

  for (const platform of PLATFORMS) {
    const value = token.codeSyntax[platform];
    if (isPresent(value)) {
      result[platform] = value.trim();
    }
  }

  return result;
}

/** Pure hybrid mapper — stored `token.codeSyntax` wins; Theme never derives. */
export function mapCodeSyntax(token: CanonicalToken): Partial<Record<CodeSyntaxPlatform, string>> {
  const stored = storedSyntax(token);

  if (token.collection === 'theme') {
    return stored;
  }

  const merged: Partial<Record<CodeSyntaxPlatform, string>> = { ...stored };

  for (const platform of PLATFORMS) {
    if (isPresent(merged[platform])) {
      continue;
    }
    const derived = deriveCodeSyntax(token, platform);
    if (isPresent(derived)) {
      merged[platform] = derived;
    }
  }

  return merged;
}

/**
 * Plugin API touchpoint for codeSyntax — call after all `setValueForMode` for a variable.
 *
 * Push order (WO-008): `createVariable` → all `setValueForMode` → `applyCodeSyntax`.
 * WO-008 `push.ts` should `import { applyCodeSyntax } from './codeSyntax'` and call once per variable.
 */
export function applyCodeSyntax(variable: Variable, token: CanonicalToken): void {
  if (typeof variable.setVariableCodeSyntax !== 'function') {
    pluginLog('[codeSyntax] setVariableCodeSyntax unavailable — skipping', variable.name);
    return;
  }

  const syntax = mapCodeSyntax(token);

  for (const platform of PLATFORMS) {
    const value = syntax[platform];
    if (value !== undefined && isPresent(value)) {
      variable.setVariableCodeSyntax(platform, value);
    }
  }
}
