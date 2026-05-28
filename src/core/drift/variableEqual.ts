/// <reference types="@figma/plugin-typings" />

import { valuesEqual } from '@/core/variables/compare';

import type { VariableComparable } from './types';

const CODE_SYNTAX_PLATFORMS: Array<'WEB' | 'ANDROID' | 'iOS'> = ['WEB', 'ANDROID', 'iOS'];

function codeSyntaxComparableEqual(
  left: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
  right: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
): boolean {
  for (let i = 0; i < CODE_SYNTAX_PLATFORMS.length; i++) {
    const platform = CODE_SYNTAX_PLATFORMS[i];
    const leftValue = left[platform] !== undefined ? left[platform] : '';
    const rightValue = right[platform] !== undefined ? right[platform] : '';
    if (leftValue !== rightValue) {
      return false;
    }
  }
  return true;
}

export function variableStatesEqual(left: VariableComparable, right: VariableComparable): boolean {
  if (left.resolvedType !== right.resolvedType) {
    return false;
  }

  const modeNames: Record<string, boolean> = {};
  for (const modeName of Object.keys(left.valuesByMode)) {
    modeNames[modeName] = true;
  }
  for (const modeName of Object.keys(right.valuesByMode)) {
    modeNames[modeName] = true;
  }

  for (const modeName of Object.keys(modeNames)) {
    const leftValue = left.valuesByMode[modeName];
    const rightValue = right.valuesByMode[modeName];
    if (leftValue === undefined || rightValue === undefined) {
      return false;
    }
    if (!valuesEqual(leftValue, rightValue)) {
      return false;
    }
  }

  return codeSyntaxComparableEqual(left.codeSyntax, right.codeSyntax);
}
