import { describe, expect, it } from 'vitest';

import {
  SCAFFOLD_STEPS,
  getScaffoldStepLabel,
  isScaffoldErrorMessage,
  isScaffoldProgressMessage,
  isScaffoldResultMessage,
  isScaffoldRunMessage,
} from '@/io/messages/scaffold';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

describe('scaffold messages', () => {
  it('SCAFFOLD_STEPS has 8 entries with doc-preflight first', () => {
    expect(SCAFFOLD_STEPS.length).toBe(8);
    expect(SCAFFOLD_STEPS[0].id).toBe('doc-preflight');
    expect(SCAFFOLD_STEPS[0].label).toBe('Pre-flight doc-pipeline check');
  });

  it('getScaffoldStepLabel resolves doc-preflight', () => {
    expect(getScaffoldStepLabel('doc-preflight')).toBe('Pre-flight doc-pipeline check');
  });

  it('isScaffoldRunMessage accepts valid run payload', () => {
    const message = {
      type: 'scaffold/run',
      spec: canonicalFixture,
      options: { registry: { v: 1, kind: 'registry', fileKey: 'abc', components: {} } },
    };
    expect(isScaffoldRunMessage(message)).toBe(true);
  });

  it('isScaffoldRunMessage rejects token payloads', () => {
    expect(
      isScaffoldRunMessage({
        type: 'scaffold/run',
        spec: { v: 1, kind: 'tokens', tokens: [] },
      }),
    ).toBe(false);
  });

  it('isScaffoldProgressMessage validates progress shape', () => {
    expect(
      isScaffoldProgressMessage({
        type: 'scaffold/progress',
        step: 'apply-bindings',
        status: 'running',
        label: 'Applying variable bindings',
      }),
    ).toBe(true);
  });

  it('isScaffoldProgressMessage accepts doc-preflight step', () => {
    expect(
      isScaffoldProgressMessage({
        type: 'scaffold/progress',
        step: 'doc-preflight',
        status: 'running',
        label: 'Pre-flight doc-pipeline check',
      }),
    ).toBe(true);
  });

  it('isScaffoldResultMessage requires registry and scaffold result', () => {
    expect(
      isScaffoldResultMessage({
        type: 'scaffold/result',
        ok: true,
        totalDurationMs: 1200,
        componentSetId: 'cs:1',
        componentSetName: 'Button — ComponentSet',
        registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
        audits: [],
        scaffold: {
          componentSet: { id: 'cs:1' },
          variantCount: 12,
          variantByKey: {},
          replacedExisting: false,
          scaffoldId: 'scaffold-1',
          auditRows: [],
          unresolvedTokens: [],
        },
      }),
    ).toBe(true);
  });

  it('isScaffoldErrorMessage accepts failed step', () => {
    expect(
      isScaffoldErrorMessage({
        type: 'scaffold/error',
        message: 'bind failed',
        failedStep: 'apply-bindings',
      }),
    ).toBe(true);
  });
});
