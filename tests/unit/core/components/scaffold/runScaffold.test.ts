import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditReportV1, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { runScaffoldComponent } from '@/core/components/scaffold/runScaffold';

import canonicalFixture from '../../../../fixtures/component-spec-button-canonical.json';

const { ensureComponentScaffoldTarget, runDocPipelinePreflightAudit, scaffold } = vi.hoisted(
  function () {
    return {
      ensureComponentScaffoldTarget: vi.fn(),
      runDocPipelinePreflightAudit: vi.fn(),
      scaffold: vi.fn(),
    };
  },
);

vi.mock('@/core/components/scaffold/ensureComponentScaffoldTarget', () => ({
  ensureComponentScaffoldTarget: ensureComponentScaffoldTarget,
}));

vi.mock('@/core/audit/runAudit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/audit/runAudit')>();
  return Object.assign({}, actual, {
    runDocPipelinePreflightAudit: runDocPipelinePreflightAudit,
  });
});

vi.mock('@/core/components/scaffold', () => ({
  scaffold: scaffold,
}));

vi.mock('@/io/github/storage', () => ({
  getLastRepoUrl: vi.fn().mockResolvedValue(null),
  getSyncState: vi.fn().mockResolvedValue(null),
}));

function makePreflightAudit(passed: boolean, diagnostic: string): AuditReportV1 {
  return {
    v: 1,
    kind: 'audit-report',
    meta: {
      generatedAt: new Date().toISOString(),
      scope: 'component',
      operation: 'scaffold-component',
    },
    passed,
    summary: {
      variablesCreated: 0,
      variablesUpdated: 0,
      variablesSkipped: 0,
      rulesPassed: passed ? 1 : 0,
      rulesFailed: passed ? 0 : 1,
      rulesWarned: 0,
      modeCoverage: {},
      codeSyntaxCoverage: {
        WEB: { expected: 0, missing: 0 },
        ANDROID: { expected: 0, missing: 0 },
        iOS: { expected: 0, missing: 0 },
      },
    },
    results: [
      {
        ruleId: 'doc-pipeline/required-tokens',
        pass: passed,
        diagnostic,
        severity: 'error',
      },
    ],
  };
}

describe('runScaffoldComponent doc-preflight', () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessage = vi.fn();
    ensureComponentScaffoldTarget.mockReset();
    runDocPipelinePreflightAudit.mockReset();
    scaffold.mockReset();

    vi.stubGlobal('figma', {
      fileKey: 'test-file-key',
      ui: { postMessage: postMessage },
    });
  });

  it('exits before ensureComponentScaffoldTarget when preflight fails', async () => {
    const diagnostic = 'Run design-system bootstrap first. Missing color tokens: color/border/subtle';
    runDocPipelinePreflightAudit.mockResolvedValue(makePreflightAudit(false, diagnostic));

    await runScaffoldComponent(canonicalFixture as ComponentSpecV1);

    expect(ensureComponentScaffoldTarget).not.toHaveBeenCalled();
    expect(scaffold).not.toHaveBeenCalled();

    const errorMessage = postMessage.mock.calls.find(function (call) {
      const message = call[0] as { type?: string };
      return message.type === 'scaffold/error';
    });
    expect(errorMessage).toBeDefined();
    const errorPayload = errorMessage![0] as {
      type: string;
      message: string;
      failedStep?: string;
    };
    expect(errorPayload.message).toBe(diagnostic);
    expect(errorPayload.failedStep).toBe('doc-preflight');

    const preflightError = postMessage.mock.calls.find(function (call) {
      const message = call[0] as { type?: string; step?: string; status?: string };
      return (
        message.type === 'scaffold/progress' &&
        message.step === 'doc-preflight' &&
        message.status === 'error'
      );
    });
    expect(preflightError).toBeDefined();
  });

  it('runs ensureComponentScaffoldTarget after preflight passes', async () => {
    runDocPipelinePreflightAudit.mockResolvedValue(
      makePreflightAudit(true, 'All required tokens, text styles, and font-family variables present.'),
    );
    ensureComponentScaffoldTarget.mockImplementation(function () {
      throw new Error('stop-after-target');
    });

    await runScaffoldComponent(canonicalFixture as ComponentSpecV1);

    expect(ensureComponentScaffoldTarget).toHaveBeenCalledWith('Button');
    expect(runDocPipelinePreflightAudit).toHaveBeenCalledTimes(1);

    const doneProgress = postMessage.mock.calls.find(function (call) {
      const message = call[0] as { type?: string; step?: string; status?: string };
      return (
        message.type === 'scaffold/progress' &&
        message.step === 'doc-preflight' &&
        message.status === 'done'
      );
    });
    expect(doneProgress).toBeDefined();
  });
});
