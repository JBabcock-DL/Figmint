import { describe, expect, it } from 'vitest';

import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import {
  isAdaptedTokensV1,
  isPushErrorMessage,
  isPushResultMessage,
  isPushUiMessage,
  isPushVariablesMessage,
} from '@/io/messages/push';

const minimalTokens: TokensV1 = {
  v: 1,
  kind: 'tokens',
  collections: [{ id: 'primitives', modes: ['Default'] }],
  tokens: [
    {
      collection: 'primitives',
      name: 'color/brand',
      type: 'COLOR',
      valuesByMode: { Default: { r: 0, g: 0.33, b: 1, a: 1 } },
    },
  ],
};

describe('push message guards', () => {
  it('accepts push/variables with canonical TokensV1', () => {
    const msg = { type: 'push/variables', tokens: minimalTokens };
    expect(isPushVariablesMessage(msg)).toBe(true);
  });

  it('rejects push/variables without tokens body', () => {
    expect(isPushVariablesMessage({ type: 'push/variables' })).toBe(false);
    expect(isPushVariablesMessage({ type: 'push/variables', tokens: { v: 2 } })).toBe(false);
  });

  it('accepts push/result shape', () => {
    const msg = {
      type: 'push/result',
      result: {
        created: 1,
        updated: 0,
        skipped: 0,
        errors: [],
        passes: [],
        totalDurationMs: 42,
      },
      audit: {
        v: 1,
        kind: 'audit-report',
        meta: {
          generatedAt: '2026-01-01T00:00:00.000Z',
          scope: 'variables',
          operation: 'push-variables',
        },
        passed: true,
        summary: {
          variablesCreated: 1,
          variablesUpdated: 0,
          variablesSkipped: 0,
          rulesPassed: 1,
          rulesFailed: 0,
          rulesWarned: 0,
          modeCoverage: {},
          codeSyntaxCoverage: {
            WEB: { expected: 0, missing: 0 },
            ANDROID: { expected: 0, missing: 0 },
            iOS: { expected: 0, missing: 0 },
          },
        },
        results: [],
      },
    };
    expect(isPushResultMessage(msg)).toBe(true);
    expect(isPushUiMessage(msg)).toBe(true);
  });

  it('accepts push/error shape', () => {
    const msg = { type: 'push/error', message: 'adapt failed', path: 'tokens[0]' };
    expect(isPushErrorMessage(msg)).toBe(true);
    expect(isPushUiMessage(msg)).toBe(true);
  });
});

describe('isAdaptedTokensV1', () => {
  it('returns true for adapted TokensV1', () => {
    expect(isAdaptedTokensV1(minimalTokens)).toBe(true);
  });

  it('returns false for format-error', () => {
    expect(isAdaptedTokensV1({ kind: 'format-error', message: 'bad' })).toBe(false);
  });
});
