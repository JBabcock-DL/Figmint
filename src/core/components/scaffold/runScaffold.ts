/// <reference types="@figma/plugin-typings" />

import type { AuditReportV1, AuditRuleResult, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { runAudit, runDocPipelinePreflightAudit } from '@/core/audit/runAudit';
import { getLastRepoUrl, getSyncState } from '@/io/github/storage';
import { buildRegistryAuditRows } from '@/core/components/registryAuditRows';
import { applyBindings } from '@/core/components/scaffold/applyBindings';
import { applyProperties } from '@/core/components/scaffold/applyProperties';
import { scaffold } from '@/core/components/scaffold';
import { ensureComponentScaffoldTarget } from '@/core/components/scaffold/ensureComponentScaffoldTarget';
import { buildDocPipeline } from '@/core/canvas/doc';
import {
  getRegistryFromSnapshot,
  upsertSnapshotRegistryEntry,
} from '@/core/sync/snapshotStore';
import type { ApplyBindingsResult, ApplyPropertiesResult, ScaffoldResult } from '@/core/components/scaffold/types';
import { pluginLog } from '@/core/pluginLog';
import {
  getScaffoldStepLabel,
  type ScaffoldErrorMessage,
  type ScaffoldProgressMessage,
  type ScaffoldResultMessage,
  type ScaffoldRunMessage,
  type ScaffoldStepId,
  type ScaffoldStepStatus,
} from '@/io/messages/scaffold';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as Record<'message', unknown>).message;
    return String(message);
  }
  return String(error);
}

function readFileKey(): string {
  if (figma.fileKey !== undefined && figma.fileKey.length > 0) {
    return figma.fileKey;
  }
  return '';
}

function computePassed(results: AuditRuleResult[]): boolean {
  for (let i = 0; i < results.length; i++) {
    const severity = results[i].severity !== undefined ? results[i].severity : 'error';
    if (!results[i].pass && severity !== 'warn') {
      return false;
    }
  }
  return true;
}

function buildAuditReportFromRows(
  results: AuditRuleResult[],
  operation: 'scaffold-component' | 'apply-bindings' | 'push-variables',
): AuditReportV1 {
  let rulesPassed = 0;
  let rulesFailed = 0;
  let rulesWarned = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.pass) {
      rulesPassed += 1;
    } else {
      const severity = result.severity !== undefined ? result.severity : 'error';
      if (severity === 'warn') {
        rulesWarned += 1;
      } else {
        rulesFailed += 1;
      }
    }
  }

  const fileKey = readFileKey();
  const metaBase = {
    generatedAt: new Date().toISOString(),
    scope: 'component' as const,
    operation: operation,
  };
  const meta =
    fileKey.length > 0
      ? Object.assign({}, metaBase, { figmaFileKey: fileKey })
      : metaBase;

  return {
    v: 1,
    kind: 'audit-report',
    meta: meta,
    passed: computePassed(results),
    summary: {
      variablesCreated: 0,
      variablesUpdated: 0,
      variablesSkipped: 0,
      rulesPassed: rulesPassed,
      rulesFailed: rulesFailed,
      rulesWarned: rulesWarned,
      modeCoverage: {},
      codeSyntaxCoverage: {
        WEB: { expected: 0, missing: 0 },
        ANDROID: { expected: 0, missing: 0 },
        iOS: { expected: 0, missing: 0 },
      },
    },
    results: results,
  };
}

function postProgress(
  step: ScaffoldStepId,
  status: ScaffoldStepStatus,
  extras?: {
    detail?: string;
    elapsedMs?: number;
    audit?: AuditReportV1;
  },
): void {
  const message: ScaffoldProgressMessage = {
    type: 'scaffold/progress',
    step: step,
    status: status,
    label: getScaffoldStepLabel(step),
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

function postScaffoldError(message: string, failedStep?: ScaffoldStepId): void {
  const errResponse: ScaffoldErrorMessage = {
    type: 'scaffold/error',
    message: message,
  };
  if (failedStep !== undefined) {
    errResponse.failedStep = failedStep;
  }
  figma.ui.postMessage(errResponse);
}

async function buildBindingsAudit(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
  bindingsResult: ApplyBindingsResult,
): Promise<AuditReportV1 | null> {
  if (spec.bindings.length === 0) {
    return null;
  }
  return runAudit('component', {
    spec: spec,
    componentSet: componentSet,
    bindingsResult: bindingsResult,
  });
}

async function buildPropertiesAudit(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
  propertiesResult: ApplyPropertiesResult,
): Promise<AuditReportV1 | null> {
  if (spec.props.length === 0 && propertiesResult.implicitProps.length === 0) {
    return null;
  }
  return runAudit('component', {
    spec: spec,
    componentSet: componentSet,
    applyPropertiesResult: propertiesResult,
  });
}

export async function runScaffoldComponent(
  spec: ComponentSpecV1,
  options?: ScaffoldRunMessage['options'],
): Promise<void> {
  const startedAt = Date.now();
  const audits: AuditReportV1[] = [];
  const fileKey = readFileKey();

  let scaffoldResult: ScaffoldResult;
  let bindingsResult: ApplyBindingsResult | undefined;
  let propertiesResult: ApplyPropertiesResult | undefined;

  try {
    postProgress('doc-preflight', 'running');
    let fighubConfigParseError: string | undefined;
    const lastRepo = await getLastRepoUrl();
    if (lastRepo !== null) {
      const syncState = await getSyncState(lastRepo);
      if (
        syncState !== null &&
        syncState.configWarning !== undefined &&
        syncState.configWarning !== null &&
        syncState.configWarning.length > 0
      ) {
        fighubConfigParseError = syncState.configWarning;
      }
    }
    const preflightAudit = await runDocPipelinePreflightAudit(fighubConfigParseError);
    audits.push(preflightAudit);
    if (!preflightAudit.passed) {
      const reason = preflightAudit.results[0]?.diagnostic ?? 'Pre-flight failed';
      postProgress('doc-preflight', 'error', { detail: reason, audit: preflightAudit });
      postScaffoldError(reason, 'doc-preflight');
      return;
    }
    postProgress('doc-preflight', 'done');

    const scaffoldTarget = ensureComponentScaffoldTarget(spec.name);
    const targetPage = scaffoldTarget.page;

    postProgress('scaffold-geometry', 'running');
    pluginLog('[main] scaffold-geometry start', spec.name);

    const scaffoldOptions =
      options !== undefined && options.registry !== undefined
        ? { registry: options.registry }
        : undefined;
    scaffoldResult = await scaffold(spec, scaffoldTarget, scaffoldOptions);

    if (scaffoldResult.auditRows.length > 0) {
      audits.push(buildAuditReportFromRows(scaffoldResult.auditRows, 'scaffold-component'));
    }

    postProgress('scaffold-geometry', 'done', {
      detail: String(scaffoldResult.variantCount) + ' variants',
    });
    pluginLog('[main] scaffold-geometry done', String(scaffoldResult.variantCount));

    postProgress('apply-bindings', 'running');
    bindingsResult = await applyBindings(spec, scaffoldResult.componentSet);
    const bindingsAudit = await buildBindingsAudit(
      spec,
      scaffoldResult.componentSet,
      bindingsResult,
    );
    if (bindingsAudit !== null) {
      audits.push(bindingsAudit);
    }
    postProgress('apply-bindings', 'done', {
      detail:
        String(bindingsResult.applied) +
        ' applied' +
        (bindingsResult.failed.length > 0
          ? ', ' + String(bindingsResult.failed.length) + ' failed'
          : ''),
      audit: bindingsAudit !== null ? bindingsAudit : undefined,
    });

    postProgress('apply-properties', 'running');
    propertiesResult = applyProperties(spec, scaffoldResult.componentSet);
    const propertiesAudit = await buildPropertiesAudit(
      spec,
      scaffoldResult.componentSet,
      propertiesResult,
    );
    if (propertiesAudit !== null) {
      audits.push(propertiesAudit);
    }
    postProgress('apply-properties', 'done', {
      detail: propertiesResult.ok ? 'Properties applied' : 'Properties applied with warnings',
      audit: propertiesAudit !== null ? propertiesAudit : undefined,
    });

    if (options !== undefined && options.skipUsageFrame === true) {
      postProgress('build-doc-pipeline', 'skipped', { detail: 'Skipped (dev flag)' });
    } else {
      postProgress('build-doc-pipeline', 'running');
      try {
        const pipelineResult = await buildDocPipeline(scaffoldResult.componentSet, spec, {
          scaffoldTarget: scaffoldTarget,
          targetPage: targetPage,
          docRoot: scaffoldTarget.docRoot,
          variantByKey: scaffoldResult.variantByKey,
          applyPropertiesResult: propertiesResult,
          scaffoldId: scaffoldResult.scaffoldId,
        });
        if (pipelineResult.auditRows.length > 0) {
          audits.push(buildAuditReportFromRows(pipelineResult.auditRows, 'scaffold-component'));
        }
        postProgress('build-doc-pipeline', 'done', {
          detail: '5 doc sections',
        });
      } catch (pipelineError) {
        const pipelineMessage = extractErrorMessage(pipelineError);
        pluginLog('[main] build-doc-pipeline failed', pipelineMessage);
        postProgress('build-doc-pipeline', 'error', { detail: pipelineMessage });
        postScaffoldError(pipelineMessage, 'build-doc-pipeline');
        return;
      }
    }

    let registry =
      options !== undefined && options.registry !== undefined
        ? options.registry
        : getRegistryFromSnapshot();

    if (options === undefined || options.skipRegistry !== true) {
      postProgress('update-registry', 'running');
      registry = upsertSnapshotRegistryEntry({
        registry: registry,
        spec: spec,
        scaffold: scaffoldResult,
        targetPage: targetPage,
        fileKey: fileKey,
      });
      postProgress('update-registry', 'done', { detail: 'Registry entry updated' });
    } else {
      postProgress('update-registry', 'skipped', { detail: 'Registry update skipped' });
    }

    postProgress('audit-component', 'running');
    const entry = registry.components[spec.name];
    if (entry !== undefined) {
      const registryRows = buildRegistryAuditRows(registry, spec.name, entry);
      if (registryRows.length > 0) {
        audits.push(buildAuditReportFromRows(registryRows, 'scaffold-component'));
      }
    }
    postProgress('audit-component', 'done');

    postProgress('complete', 'done');

    let allPassed = true;
    for (let i = 0; i < audits.length; i++) {
      if (!audits[i].passed) {
        allPassed = false;
        break;
      }
    }

    const resultMessage: ScaffoldResultMessage = {
      type: 'scaffold/result',
      ok: allPassed,
      totalDurationMs: Date.now() - startedAt,
      componentSetId: scaffoldResult.componentSet.id,
      componentSetName: scaffoldResult.componentSet.name,
      registry: registry,
      audits: audits,
      scaffold: scaffoldResult,
      bindings: bindingsResult,
      properties: propertiesResult,
    };
    figma.ui.postMessage(resultMessage);
    pluginLog(
      '[main] scaffold/result',
      String(resultMessage.totalDurationMs) + 'ms',
      scaffoldResult.componentSet.name,
    );
  } catch (error) {
    const message = extractErrorMessage(error);
    pluginLog('[main] scaffold/run unhandled', message);
    postScaffoldError(message);
  }
}
