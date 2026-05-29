import { describe, expect, it } from 'vitest';

import {
  createInitialScaffoldProgressState,
  reduceScaffoldProgress,
} from '@/ui/components/scaffold/scaffoldProgressReducer';

describe('scaffoldProgressReducer', () => {
  it('starts scaffold run with running=true', () => {
    const started = reduceScaffoldProgress(createInitialScaffoldProgressState(), {
      type: 'scaffold/start',
    });
    expect(started.running).toBe(true);
  });

  it('updates step from scaffold/progress', () => {
    const started = reduceScaffoldProgress(createInitialScaffoldProgressState(), {
      type: 'scaffold/start',
    });
    const next = reduceScaffoldProgress(started, {
      type: 'scaffold/progress',
      step: 'apply-bindings',
      status: 'done',
      label: 'Applying variable bindings',
      detail: '24 applied',
    });
    const step = next.steps.find(function (row) {
      return row.id === 'apply-bindings';
    });
    expect(step?.status).toBe('done');
    expect(step?.detail).toBe('24 applied');
  });

  it('finishes on scaffold/result and stores registry', () => {
    const started = reduceScaffoldProgress(createInitialScaffoldProgressState(), {
      type: 'scaffold/start',
    });
    const result = reduceScaffoldProgress(started, {
      type: 'scaffold/result',
      ok: true,
      totalDurationMs: 900,
      componentSetId: 'cs:1',
      componentSetName: 'Button',
      registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
      audits: [],
      scaffold: {
        componentSet: { id: 'cs:1' } as import('@figma/plugin-typings').ComponentSetNode,
        variantCount: 12,
        variantByKey: {},
        replacedExisting: false,
        scaffoldId: 'id-1',
        auditRows: [],
        unresolvedTokens: [],
      },
    });
    expect(result.running).toBe(false);
    expect(result.result?.totalDurationMs).toBe(900);
    const complete = result.steps.find(function (row) {
      return row.id === 'complete';
    });
    expect(complete?.status).toBe('done');
  });

  it('resets to initial state', () => {
    const started = reduceScaffoldProgress(createInitialScaffoldProgressState(), {
      type: 'scaffold/start',
    });
    const reset = reduceScaffoldProgress(started, { type: 'scaffold/reset' });
    expect(reset.running).toBe(false);
    expect(reset.result).toBeNull();
  });
});
