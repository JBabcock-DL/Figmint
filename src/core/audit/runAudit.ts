/// <reference types="@figma/plugin-typings" />

import type { AuditReportV1, AuditScope } from '@detroitlabs/fighub-contracts';

import { mergeProbeWithStats, probeCanvasPage } from './probeCanvasPage';
import { runComponentBindingRules } from './rules/componentBindings';
import { runComponentRules } from './rules/componentRules';
import { runCanvasRules } from './rules/canvasRules';
import { runDocPipelinePreflightRules, runVariableRules } from './rules';
import { buildAuditSummary } from './summary';
import type { CanvasAuditInput, ComponentAuditInput, VariablesAuditInput } from './types';

function computePassed(results: AuditReportV1['results']): boolean {
  for (const result of results) {
    const severity = result.severity !== undefined ? result.severity : 'error';
    if (!result.pass && severity !== 'warn') {
      return false;
    }
  }
  return true;
}

function readFigmaFileKey(): string | undefined {
  if (typeof figma === 'undefined') {
    return undefined;
  }
  try {
    const key = figma.fileKey;
    return typeof key === 'string' && key.length > 0 ? key : undefined;
  } catch {
    return undefined;
  }
}

function buildCanvasSummary(results: AuditReportV1['results']): AuditReportV1['summary'] {
  let rulesPassed = 0;
  let rulesFailed = 0;
  let rulesWarned = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const severity = result.severity !== undefined ? result.severity : 'error';
    if (result.pass) {
      rulesPassed += 1;
    } else if (severity === 'warn') {
      rulesWarned += 1;
    } else {
      rulesFailed += 1;
    }
  }
  return {
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
  };
}

export function runAudit(scope: 'variables', input: VariablesAuditInput): Promise<AuditReportV1>;
export function runAudit(scope: 'canvas', input: CanvasAuditInput): Promise<AuditReportV1>;
export function runAudit(scope: 'component', input: ComponentAuditInput): Promise<AuditReportV1>;
export function runAudit(
  scope: AuditScope,
  input: VariablesAuditInput | CanvasAuditInput | ComponentAuditInput,
): Promise<AuditReportV1> {
  if (scope === 'variables') {
    const variableInput = input as VariablesAuditInput;
    const results = runVariableRules(variableInput);
    const passed = computePassed(results);
    const fileKey = readFigmaFileKey();
    const meta = {
      generatedAt: new Date().toISOString(),
      scope: 'variables' as const,
      operation: 'push-variables' as const,
    };
    const reportMeta: AuditReportV1['meta'] = fileKey
      ? Object.assign({}, meta, { figmaFileKey: fileKey })
      : meta;

    return Promise.resolve({
      v: 1,
      kind: 'audit-report',
      meta: reportMeta,
      passed: passed,
      summary: buildAuditSummary(
        results,
        variableInput.pushResult,
        variableInput.canonical,
        variableInput.figmaCollections,
      ),
      results: results,
    });
  }

  if (scope === 'canvas') {
    const canvasInput = input as CanvasAuditInput;
    let probe = canvasInput.probeOverride;
    if (probe === undefined) {
      if (canvasInput.page === undefined) {
        return Promise.reject(new Error('canvas audit requires page or probeOverride'));
      }
      probe = probeCanvasPage(canvasInput.page);
    }
    probe = mergeProbeWithStats(probe, canvasInput.stats);

    const results = runCanvasRules(canvasInput, probe);
    const passed = computePassed(results);
    const fileKey = readFigmaFileKey();
    const metaBase = {
      generatedAt: new Date().toISOString(),
      scope: 'canvas' as const,
      operation: 'push-variables' as const,
    };
    const reportMeta: AuditReportV1['meta'] = fileKey
      ? Object.assign({}, metaBase, { figmaFileKey: fileKey })
      : metaBase;

    return Promise.resolve({
      v: 1,
      kind: 'audit-report',
      meta: reportMeta,
      passed: passed,
      summary: buildCanvasSummary(results),
      results: results,
    });
  }

  if (scope === 'component') {
    const componentInput = input as ComponentAuditInput;
    const results: AuditReportV1['results'] = [];

    if (componentInput.bindingsResult !== undefined) {
      const bindingResults = runComponentBindingRules({
        spec: componentInput.spec,
        componentSet: componentInput.componentSet,
        bindingsResult: componentInput.bindingsResult,
      });
      for (let i = 0; i < bindingResults.length; i++) {
        results.push(bindingResults[i]);
      }
    }

    if (componentInput.applyPropertiesResult !== undefined) {
      const propResults = runComponentRules({
        spec: componentInput.spec,
        componentSet: componentInput.componentSet,
        applyPropertiesResult: componentInput.applyPropertiesResult,
      });
      for (let i = 0; i < propResults.length; i++) {
        results.push(propResults[i]);
      }
    }

    if (results.length === 0) {
      return Promise.reject(
        new Error('component audit requires bindingsResult and/or applyPropertiesResult'),
      );
    }

    const passed = computePassed(results);
    const fileKey = readFigmaFileKey();
    const operation = 'apply-bindings' as const;
    const metaBase = {
      generatedAt: new Date().toISOString(),
      scope: 'component' as const,
      operation: operation,
    };
    const reportMeta: AuditReportV1['meta'] = fileKey
      ? Object.assign({}, metaBase, { figmaFileKey: fileKey })
      : metaBase;

    return Promise.resolve({
      v: 1,
      kind: 'audit-report',
      meta: reportMeta,
      passed: passed,
      summary: buildCanvasSummary(results),
      results: results,
    });
  }

  return Promise.reject(new Error('unsupported audit scope: ' + String(scope)));
}

function buildPreflightSummary(results: AuditReportV1['results']): AuditReportV1['summary'] {
  return buildCanvasSummary(results);
}

async function getLocalVariableCollections(): Promise<VariableCollection[]> {
  const variablesApi = figma.variables;
  if (typeof variablesApi.getLocalVariableCollectionsAsync === 'function') {
    return variablesApi.getLocalVariableCollectionsAsync();
  }
  if (typeof variablesApi.getLocalVariableCollections === 'function') {
    return variablesApi.getLocalVariableCollections();
  }
  return [];
}

async function getLocalVariables(): Promise<Variable[]> {
  const variablesApi = figma.variables;
  if (typeof variablesApi.getLocalVariablesAsync === 'function') {
    return variablesApi.getLocalVariablesAsync();
  }
  if (typeof variablesApi.getLocalVariables === 'function') {
    return variablesApi.getLocalVariables();
  }
  return [];
}

async function getLocalTextStyles(): Promise<TextStyle[]> {
  if (typeof figma.getLocalTextStylesAsync === 'function') {
    return figma.getLocalTextStylesAsync();
  }
  if (typeof figma.getLocalTextStyles === 'function') {
    return figma.getLocalTextStyles();
  }
  return [];
}

export async function runDocPipelinePreflightAudit(
  fighubConfigParseError?: string,
): Promise<AuditReportV1> {
  const collections = await getLocalVariableCollections();
  const themeCollection = collections.find((collection) => collection.name === 'Theme');
  const typoCollection = collections.find((collection) => collection.name === 'Typography');

  const allVariables = await getLocalVariables();
  const themeVariables = themeCollection
    ? allVariables.filter((variable) => variable.variableCollectionId === themeCollection.id)
    : [];
  const typographyVariables = typoCollection
    ? allVariables.filter((variable) => variable.variableCollectionId === typoCollection.id)
    : [];

  const textStyles = await getLocalTextStyles();
  const results = runDocPipelinePreflightRules({
    themeVariables,
    typographyVariables,
    textStyles,
    fighubConfigParseError: fighubConfigParseError,
  });
  const passed = computePassed(results);
  const fileKey = readFigmaFileKey();
  const metaBase = {
    generatedAt: new Date().toISOString(),
    scope: 'component' as const,
    operation: 'scaffold-component' as const,
  };
  const reportMeta: AuditReportV1['meta'] = fileKey
    ? Object.assign({}, metaBase, { figmaFileKey: fileKey })
    : metaBase;

  return {
    v: 1,
    kind: 'audit-report',
    meta: reportMeta,
    passed,
    summary: buildPreflightSummary(results),
    results,
  };
}

export type { VariablesAuditInput };
