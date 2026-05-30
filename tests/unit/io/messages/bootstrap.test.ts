import { describe, expect, it } from 'vitest';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import {
  BOOTSTRAP_STEPS,
  getMainBootstrapStepIds,
  isBootstrapErrorMessage,
  isBootstrapProgressMessage,
  isBootstrapResultMessage,
  isBootstrapRunMessage,
  isBootstrapUiMessage,
} from '@/io/messages/bootstrap';

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

const sampleAudit = {
  v: 1 as const,
  kind: 'audit-report' as const,
  meta: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    scope: 'variables' as const,
    operation: 'push-variables' as const,
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
};

describe('bootstrap message guards', () => {
  it('accepts bootstrap/run with canonical TokensV1', () => {
    const msg = { type: 'bootstrap/run', tokens: minimalTokens };
    expect(isBootstrapRunMessage(msg)).toBe(true);
  });

  it('rejects bootstrap/run without tokens body', () => {
    expect(isBootstrapRunMessage({ type: 'bootstrap/run' })).toBe(false);
    expect(isBootstrapRunMessage({ type: 'bootstrap/run', tokens: { v: 2 } })).toBe(false);
  });

  it('accepts bootstrap/progress shape', () => {
    const msg = {
      type: 'bootstrap/progress',
      step: 'push-variables',
      status: 'running',
      label: 'Push variables',
    };
    expect(isBootstrapProgressMessage(msg)).toBe(true);
    expect(isBootstrapUiMessage(msg)).toBe(true);
  });

  it('rejects malformed bootstrap/progress payloads', () => {
    expect(
      isBootstrapProgressMessage({
        type: 'bootstrap/progress',
        step: 'not-a-step',
        status: 'running',
        label: 'x',
      }),
    ).toBe(false);
    expect(
      isBootstrapProgressMessage({
        type: 'bootstrap/progress',
        step: 'push-variables',
        status: 'running',
      }),
    ).toBe(false);
  });

  it('accepts bootstrap/result shape', () => {
    const msg = {
      type: 'bootstrap/result',
      ok: true,
      totalDurationMs: 1200,
      pushResult: {
        created: 1,
        updated: 0,
        skipped: 0,
        errors: [],
        passes: [],
        totalDurationMs: 900,
      },
      audits: [sampleAudit],
    };
    expect(isBootstrapResultMessage(msg)).toBe(true);
    expect(isBootstrapUiMessage(msg)).toBe(true);
  });

  it('accepts bootstrap/error shape', () => {
    const msg = { type: 'bootstrap/error', message: 'push failed', failedStep: 'push-variables' };
    expect(isBootstrapErrorMessage(msg)).toBe(true);
    expect(isBootstrapUiMessage(msg)).toBe(true);
  });
});

describe('BOOTSTRAP_STEPS manifest', () => {
  it('defines 11 ordered steps ending with complete', () => {
    expect(BOOTSTRAP_STEPS.length).toBe(11);
    expect(BOOTSTRAP_STEPS[0].id).toBe('adapt');
    expect(BOOTSTRAP_STEPS[BOOTSTRAP_STEPS.length - 1].id).toBe('complete');
  });

  it('main thread step list skips adapt and complete', () => {
    const ids = getMainBootstrapStepIds();
    expect(ids.includes('adapt')).toBe(false);
    expect(ids.includes('complete')).toBe(false);
    expect(ids[0]).toBe('push-variables');
    expect(ids[1]).toBe('publish-typography');
    expect(ids[2]).toBe('prepare-style-guide');
  });

  it('skipCanvas shortens main thread steps', () => {
    const ids = getMainBootstrapStepIds({ skipCanvas: true });
    expect(ids).toEqual(['push-variables', 'publish-typography', 'audit-canvas']);
  });
});
