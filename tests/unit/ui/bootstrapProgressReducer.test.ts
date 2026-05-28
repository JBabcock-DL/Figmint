import { describe, expect, it } from 'vitest';

import type { AuditReportV1 } from '@detroitlabs/fighub-contracts';

import {
  createInitialBootstrapProgressState,
  reduceBootstrapProgress,
} from '@/ui/bootstrap/bootstrapProgressReducer';

const variablesAudit: AuditReportV1 = {
  v: 1,
  kind: 'audit-report',
  meta: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    scope: 'variables',
    operation: 'push-variables',
  },
  passed: true,
  summary: {
    variablesCreated: 2,
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

describe('bootstrapProgressReducer', () => {
  it('marks adapt done when bootstrap starts', () => {
    const initial = createInitialBootstrapProgressState();
    const started = reduceBootstrapProgress(initial, { type: 'bootstrap/start' });
    const adapt = started.steps.find(function (step) {
      return step.id === 'adapt';
    });
    expect(adapt?.status).toBe('done');
    expect(started.running).toBe(true);
  });

  it('updates step status from bootstrap/progress', () => {
    const started = reduceBootstrapProgress(createInitialBootstrapProgressState(), {
      type: 'bootstrap/start',
    });
    const next = reduceBootstrapProgress(started, {
      type: 'bootstrap/progress',
      step: 'push-variables',
      status: 'running',
      label: 'Push variables',
    });
    const pushStep = next.steps.find(function (step) {
      return step.id === 'push-variables';
    });
    expect(pushStep?.status).toBe('running');
  });

  it('stores audit from push-variables progress', () => {
    const started = reduceBootstrapProgress(createInitialBootstrapProgressState(), {
      type: 'bootstrap/start',
    });
    const next = reduceBootstrapProgress(started, {
      type: 'bootstrap/progress',
      step: 'push-variables',
      status: 'done',
      label: 'Push variables',
      audit: variablesAudit,
      elapsedMs: 420,
    });
    expect(next.audits.length).toBe(1);
    expect(next.audits[0].meta.scope).toBe('variables');
  });

  it('finishes on bootstrap/result', () => {
    const started = reduceBootstrapProgress(createInitialBootstrapProgressState(), {
      type: 'bootstrap/start',
    });
    const next = reduceBootstrapProgress(started, {
      type: 'bootstrap/result',
      ok: true,
      totalDurationMs: 1500,
      pushResult: {
        created: 2,
        updated: 0,
        skipped: 0,
        errors: [],
        passes: [],
        totalDurationMs: 420,
      },
      audits: [variablesAudit],
    });
    expect(next.running).toBe(false);
    expect(next.result?.ok).toBe(true);
    const complete = next.steps.find(function (step) {
      return step.id === 'complete';
    });
    expect(complete?.status).toBe('done');
  });

  it('records bootstrap/error', () => {
    const started = reduceBootstrapProgress(createInitialBootstrapProgressState(), {
      type: 'bootstrap/start',
    });
    const next = reduceBootstrapProgress(started, {
      type: 'bootstrap/error',
      message: 'push failed',
    });
    expect(next.running).toBe(false);
    expect(next.error).toBe('push failed');
  });
});
