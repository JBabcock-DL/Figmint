/// <reference types="@figma/plugin-typings" />

import type { AuditReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import { ensureStyleGuideScaffold } from '@/core/bootstrap/ensureStyleGuideScaffold';
import { runAudit } from '@/core/audit/runAudit';
import { buildEffectsPage } from '@/core/canvas/effects';
import { buildPrimitivesPage } from '@/core/canvas/colorTables';
import { buildLayoutPage } from '@/core/canvas/layout';
import { findStyleGuidePage } from '@/core/canvas/lib/pages';
import { publishTypographyStyles } from '@/core/canvas/publishTypographyStyles';
import { buildThemePage } from '@/core/canvas/themeTables';
import { buildTextStylesPage } from '@/core/canvas/textStyles';
import { buildTokenOverviewPage } from '@/core/canvas/tokenOverview';
import type { CanvasBuildContext } from '@/core/canvas/types';
import { pluginLog } from '@/core/pluginLog';
import { pushTokens } from '@/core/variables';
import { publishDocumentationChrome } from '@/core/variables/documentationChrome';
import type { PushResult } from '@/core/variables/types';
import {
  getBootstrapStepLabel,
  getCanvasSkipDetail,
  type BootstrapErrorMessage,
  type BootstrapProgressMessage,
  type BootstrapResultMessage,
  type BootstrapRunMessage,
  type BootstrapStepId,
  type BootstrapStepStatus,
} from '@/io/messages/bootstrap';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as Record<'message', unknown>).message;
    return String(message);
  }
  return String(error);
}

function postProgress(
  step: BootstrapStepId,
  status: BootstrapStepStatus,
  extras?: {
    detail?: string;
    elapsedMs?: number;
    audit?: AuditReportV1;
  },
): void {
  const message: BootstrapProgressMessage = {
    type: 'bootstrap/progress',
    step: step,
    status: status,
    label: getBootstrapStepLabel(step),
  };
  if (extras !== undefined) {
    if (extras.detail !== undefined) {
      message.detail = extras.detail;
    }
    if (extras.elapsedMs !== undefined) {
      message.elapsedMs = extras.elapsedMs;
    }
    if (extras.audit !== undefined) {
      message.audit = extras.audit;
    }
  }
  figma.ui.postMessage(message);
}

function postBootstrapError(message: string, failedStep?: BootstrapStepId): void {
  const errResponse: BootstrapErrorMessage = {
    type: 'bootstrap/error',
    message: message,
  };
  if (failedStep !== undefined) {
    errResponse.failedStep = failedStep;
  }
  figma.ui.postMessage(errResponse);
}

function toPushResult(outcome: PushResult & { audit: AuditReportV1 }): PushResult {
  return {
    created: outcome.created,
    updated: outcome.updated,
    skipped: outcome.skipped,
    errors: outcome.errors,
    passes: outcome.passes,
    evc: outcome.evc,
    totalDurationMs: outcome.totalDurationMs,
  };
}

async function runCanvasAudit(audits: AuditReportV1[]): Promise<boolean> {
  let allPassed = true;
  const builders: Array<'text-styles' | 'token-overview' | 'layout' | 'effects'> = [
    'text-styles',
    'token-overview',
    'layout',
    'effects',
  ];
  const slugs: Array<'text-styles' | 'token-overview' | 'layout' | 'effects'> = [
    'text-styles',
    'token-overview',
    'layout',
    'effects',
  ];

  for (let i = 0; i < builders.length; i++) {
    try {
      const page = findStyleGuidePage(slugs[i]);
      const audit = await runAudit('canvas', { builder: builders[i], page: page });
      audits.push(audit);
      if (!audit.passed) {
        allPassed = false;
      }
    } catch (error) {
      pluginLog('[bootstrap] canvas audit failed', builders[i], extractErrorMessage(error));
      allPassed = false;
    }
  }

  return allPassed;
}

async function runCanvasStep(
  step: BootstrapStepId,
  run: () => Promise<{ durationMs: number }>,
  canvasErrors: Array<{ step: BootstrapStepId; message: string }>,
): Promise<void> {
  postProgress(step, 'running');
  const stepStarted = Date.now();
  try {
    const result = await run();
    postProgress(step, 'done', {
      elapsedMs: result.durationMs !== undefined ? result.durationMs : Date.now() - stepStarted,
    });
    pluginLog('[bootstrap]', step, 'done');
  } catch (error) {
    const message = extractErrorMessage(error);
    canvasErrors.push({ step: step, message: message });
    postProgress(step, 'error', { detail: message, elapsedMs: Date.now() - stepStarted });
    pluginLog('[bootstrap]', step, 'error', message);
  }
}

function skipCanvasSteps(skipDetail: string): void {
  const canvasStepIds: BootstrapStepId[] = [
    'prepare-style-guide',
    'build-primitives',
    'build-theme',
    'build-typography',
    'build-layout',
    'build-effects',
    'build-overview',
    'audit-canvas',
  ];
  for (let i = 0; i < canvasStepIds.length; i++) {
    postProgress(canvasStepIds[i], 'skipped', { detail: skipDetail });
  }
}

export async function runBootstrap(
  tokens: TokensV1,
  options?: BootstrapRunMessage['options'],
): Promise<BootstrapResultMessage> {
  const started = Date.now();
  const skipCanvas = options !== undefined && options.skipCanvas === true;
  const canvasErrors: Array<{ step: BootstrapStepId; message: string }> = [];
  const audits: AuditReportV1[] = [];
  let ok = true;
  let pushResult: PushResult | null = null;

  pluginLog('[bootstrap] start', { skipCanvas: skipCanvas, tokenCount: tokens.tokens.length });

  postProgress('push-variables', 'running');
  try {
    const outcome = await pushTokens(tokens);
    pushResult = toPushResult(outcome);
    audits.push(outcome.audit);
    postProgress('push-variables', 'done', {
      audit: outcome.audit,
      elapsedMs: outcome.totalDurationMs,
    });
    pluginLog('[bootstrap] push-variables done', String(outcome.totalDurationMs) + 'ms', {
      created: outcome.created,
      updated: outcome.updated,
      auditPassed: outcome.audit.passed,
    });

    if (outcome.errors.length > 0) {
      const errorMessage =
        'Variable push failed with ' + String(outcome.errors.length) + ' error(s)';
      postProgress('push-variables', 'error', { detail: errorMessage });
      postBootstrapError(errorMessage, 'push-variables');
      return {
        type: 'bootstrap/result',
        ok: false,
        totalDurationMs: Date.now() - started,
        pushResult: pushResult,
        audits: audits,
      };
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    postProgress('push-variables', 'error', { detail: message });
    postBootstrapError(message, 'push-variables');
    return {
      type: 'bootstrap/result',
      ok: false,
      totalDurationMs: Date.now() - started,
      pushResult:
        pushResult !== null
          ? pushResult
          : {
              created: 0,
              updated: 0,
              skipped: 0,
              errors: [],
              passes: [],
              totalDurationMs: 0,
            },
      audits: audits,
    };
  }

  postProgress('publish-typography', 'running');
  const typographyStarted = Date.now();
  try {
    await publishDocumentationChrome();
    pluginLog('[bootstrap] publish-documentation-chrome done');
  } catch (error) {
    const message = extractErrorMessage(error);
    pluginLog('[bootstrap] publish-documentation-chrome warning', message);
  }

  try {
    await publishTypographyStyles(tokens);
    postProgress('publish-typography', 'done', { elapsedMs: Date.now() - typographyStarted });
    pluginLog('[bootstrap] publish-typography done');
  } catch (error) {
    const message = extractErrorMessage(error);
    postProgress('publish-typography', 'error', {
      detail: message,
      elapsedMs: Date.now() - typographyStarted,
    });
    pluginLog('[bootstrap] publish-typography warning', message);
  }

  if (skipCanvas) {
    skipCanvasSteps(getCanvasSkipDetail());
  } else if (pushResult !== null) {
    postProgress('prepare-style-guide', 'running');
    const scaffoldStarted = Date.now();
    try {
      const scaffold = await ensureStyleGuideScaffold();
      const detailParts: string[] = [];
      if (scaffold.pagesCreated.length > 0) {
        detailParts.push('Created ' + String(scaffold.pagesCreated.length) + ' page(s)');
      }
      if (scaffold.effectStylesPublished.length > 0) {
        detailParts.push(
          'Published ' + String(scaffold.effectStylesPublished.length) + ' effect style(s)',
        );
      }
      postProgress('prepare-style-guide', 'done', {
        elapsedMs: Date.now() - scaffoldStarted,
        detail: detailParts.length > 0 ? detailParts.join('; ') : undefined,
      });
      pluginLog('[bootstrap] prepare-style-guide done', scaffold);
    } catch (error) {
      const message = extractErrorMessage(error);
      canvasErrors.push({ step: 'prepare-style-guide', message: message });
      postProgress('prepare-style-guide', 'error', {
        detail: message,
        elapsedMs: Date.now() - scaffoldStarted,
      });
      pluginLog('[bootstrap] prepare-style-guide error', message);
    }

    const ctx: CanvasBuildContext = { tokens: tokens, pushResult: pushResult };

    await runCanvasStep(
      'build-primitives',
      function () {
        return buildPrimitivesPage(tokens, { pageSlug: 'primitives' });
      },
      canvasErrors,
    );

    await runCanvasStep(
      'build-theme',
      function () {
        return buildThemePage(tokens, { pageSlug: 'theme' });
      },
      canvasErrors,
    );

    await runCanvasStep(
      'build-typography',
      function () {
        return buildTextStylesPage(ctx);
      },
      canvasErrors,
    );

    await runCanvasStep(
      'build-layout',
      function () {
        return buildLayoutPage(ctx);
      },
      canvasErrors,
    );

    await runCanvasStep(
      'build-effects',
      function () {
        return buildEffectsPage(ctx);
      },
      canvasErrors,
    );

    await runCanvasStep(
      'build-overview',
      function () {
        return buildTokenOverviewPage(ctx);
      },
      canvasErrors,
    );

    postProgress('audit-canvas', 'running');
    const auditStarted = Date.now();
    const canvasAuditPassed = await runCanvasAudit(audits);
    if (!canvasAuditPassed) {
      ok = false;
    }
    postProgress('audit-canvas', canvasAuditPassed ? 'done' : 'error', {
      elapsedMs: Date.now() - auditStarted,
    });
  }

  if (canvasErrors.length > 0) {
    ok = false;
  }

  const totalDurationMs = Date.now() - started;

  // Single undo group for the entire bootstrap run — commit once at end.
  figma.commitUndo();

  postProgress('complete', 'done', { elapsedMs: totalDurationMs });

  const result: BootstrapResultMessage = {
    type: 'bootstrap/result',
    ok: ok,
    totalDurationMs: totalDurationMs,
    pushResult:
      pushResult !== null
        ? pushResult
        : {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            passes: [],
            totalDurationMs: 0,
          },
    audits: audits,
  };

  if (canvasErrors.length > 0) {
    result.canvasErrors = canvasErrors;
  }

  figma.ui.postMessage(result);
  pluginLog('[bootstrap] complete', String(totalDurationMs) + 'ms', { ok: ok });

  return result;
}
