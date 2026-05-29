// Figma plugin main-thread entry. ES2017 target (Figma's QuickJS sandbox rejects
// ES2020+ syntax — optional chaining, nullish coalescing, replaceAll). The UI HTML
// is injected at build time via Vite's `define.__html__`, which reads the finalized
// `dist/ui.html` produced by the UI build pass — see vite.config.ts.

import { runBootstrap } from '@/core/bootstrap/runBootstrap';
import { runScaffoldComponent } from '@/core/components/scaffold/runScaffold';
import { readFigmaVariableState } from '@/core/audit/readFigmaVariableState';
import {
  detectComponentDrift,
  detectVariableDrift,
  flattenFigmaVariableSnapshots,
  flattenRepoTokens,
  buildRepoSpecMap,
  readSnapshotComponentComparables,
  readVariableSnapshotTokens,
  runDetectDrift,
} from '@/core/drift';
import { collectFigmaComponentComparablesFromSnapshot } from '@/core/drift/detectOrchestration';
import { buildPushCommitFiles, resolutionsForBulkPush } from '@/core/drift/applyPushResolutions';
import { applyPullResolutions } from '@/core/drift/applyPullResolutions';
import type { ComponentComparable } from '@/core/drift/types';
import { getRegistryFromSnapshot } from '@/core/sync/snapshotStore';
import { pushTokens } from '@/core/variables';
import { runCanvasBench } from '@/core/canvas/bench';
import { buildPrimitivesPage } from '@/core/canvas/colorTables';
import { buildThemePage } from '@/core/canvas/themeTables';
import { buildTextStylesPage } from '@/core/canvas/textStyles';
import { buildEffectsPage } from '@/core/canvas/effects';
import { buildLayoutPage } from '@/core/canvas/layout';
import { buildTokenOverviewPage } from '@/core/canvas/tokenOverview';
import type { CanvasBuildContext } from '@/core/canvas/types';
import { pluginLog } from '@/core/pluginLog';
import {
  isCanvasBenchMessage,
  isCanvasBuildPageMessage,
  type CanvasBenchResultMessage,
  type CanvasBuildErrorMessage,
  type CanvasBuildResultMessage,
} from '@/io/messages/canvas';
import { isBootstrapRunMessage } from '@/io/messages/bootstrap';
import { isScaffoldRunMessage } from '@/io/messages/scaffold';
import {
  isDriftBuildReportMessage,
  isDriftDetectComponentsMessage,
  isDriftDetectQuickMessage,
  isDriftDetectVariablesMessage,
  isOpsDetectDriftMessage,
  isResolutionBulkPullMessage,
  isResolutionBulkPushMessage,
  type DriftBuildReportResultMessage,
  type DriftDetectComponentsResultMessage,
  type DriftDetectQuickResultMessage,
  type DriftDetectVariablesResultMessage,
  type OpsDetectDriftResultMessage,
  type ResolutionBulkPullMessage,
  type ResolutionBulkPushMessage,
  type ResolutionBulkResultMessage,
} from '@/io/messages/drift';
import { isSnapshotReadMessage, type SnapshotReadResultMessage } from '@/io/messages/snapshot';
import {
  isPushVariablesMessage,
  type PushErrorMessage,
  type PushResultMessage,
} from '@/io/messages/push';
import {
  isGitHubContentsFetchMessage,
  isGitHubOAuthPollMessage,
  isGitHubOAuthStartMessage,
  isGitHubRepoFetchMessage,
  isGitHubRepoPullMessage,
  isGitHubRepoPushMessage,
  isGitHubTokenClearMessage,
  isGitHubTokenProbeMessage,
  isGitHubTokenSaveMessage,
  isGitHubSessionLoadMessage,
  type GitHubContentsErrorMessage,
  type GitHubContentsResultMessage,
  type GitHubErrorMessage,
  type GitHubOAuthDeviceCodeMessage,
  type GitHubOAuthPollResultMessage,
  type GitHubRepoFetchResultMessage,
  type GitHubRepoPullResultMessage,
  type GitHubRepoPushResultMessage,
  type GitHubSessionLoadedMessage,
  type GitHubTokenStatusMessage,
} from '@/io/messages/github';
import { fetchRepoFileContents, GitHubAuthError, GitHubNotFoundError } from '@/io/github/contents';
import { createPullRequestFlow } from '@/io/github/createPullRequestFlow';
import { buildDefaultHeadBranch } from '@/io/github/branchName';
import { renderDriftChangeTableMarkdown } from '@/core/drift/driftChangeSummary';
import {
  buildDriftReportPrTitle,
  buildDriftResolutionPrBody,
  buildPrBody,
} from '@/io/github/prBody';
import { pollDeviceFlow, startDeviceFlow } from '@/io/github/oauth';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import {
  fetchFigHubConfigFromRepo,
  normalizeExportBasePath,
  repoTokensCacheKey,
} from '@/io/github/repoSync';
import {
  clearLastRepoUrl,
  clearSyncState,
  clearToken,
  getLastRepoUrl,
  getSyncState,
  getToken,
  setLastRepoUrl,
  setSyncState,
  setToken,
} from '@/io/github/storage';
import {
  isExportRunMessage,
  type ExportBySinkResult,
  type ExportCompleteMessage,
  type ExportRunMessage,
  type ExportSinkResultMessage,
} from '@/io/messages/export';
import {
  isSinkOutputPageMessage,
  isSinkPluginDataMessage,
  type SinkErrorMessage,
  type SinkResultMessage,
} from '@/io/messages/sinks';
import { executeGithubPRSink } from '@/io/sinks/githubPR';
import { prepareSinkContent } from '@/io/sinks/prepareContent';
import { writeToOutputPage } from '@/io/sinks/outputPage';
import { writeToPluginData } from '@/io/sinks/pluginData';
import type { ContractKind, LoadedDocument } from '@/io/sources/types';
import type {
  FormatOptions,
  GithubPRSinkContext,
  SerializableDocument,
  SinkId,
  SinkResult,
} from '@/io/sinks/types';

figma.showUI(__html__, { width: 420, height: 520 });

function tokenPreview(token: string): string {
  if (token.length < 8) {
    return '***';
  }
  return token.slice(0, 4) + '…' + token.slice(-4);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGitHubPrTestOpenMessage(message: unknown): message is {
  type: 'github/pr/test-open';
  requestId: string;
  repoUrl: string;
  headBranch: string;
  filePath: string;
  fileContent: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  baseBranch?: string;
} {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/pr/test-open' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string' &&
    typeof message.headBranch === 'string' &&
    typeof message.filePath === 'string' &&
    typeof message.fileContent === 'string' &&
    typeof message.commitMessage === 'string' &&
    typeof message.prTitle === 'string' &&
    typeof message.prBody === 'string'
  );
}

async function sendGitHubTokenStatus(repoUrl: string): Promise<void> {
  let normalized: string;
  try {
    normalized = normalizeRepoUrl(repoUrl);
  } catch (error) {
    const errResponse: GitHubErrorMessage = {
      type: 'github/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  const token = await getToken(normalized);
  const status: GitHubTokenStatusMessage = {
    type: 'github/token/status',
    repoUrl: normalized,
    connected: token !== null,
    scope: token !== null ? token.scope : undefined,
    tokenPreview: token !== null ? tokenPreview(token.accessToken) : undefined,
  };
  figma.ui.postMessage(status);
}

async function handleGitHubRepoFetch(requestId: string, repoUrl: string): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  const token = await getToken(normalized);
  if (token === null) {
    const errResponse: GitHubRepoFetchResultMessage = {
      type: 'github/repo/fetch-result',
      requestId: requestId,
      ok: false,
      error: 'GitHub is not connected for this repository.',
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  try {
    const ownerRepo = parseOwnerRepo(normalized);
    const fetched = await fetchFigHubConfigFromRepo(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
    );
    const lastFetchedAt = new Date().toISOString();
    await setSyncState(normalized, {
      resolvedConfig: fetched.resolvedConfig,
      lastFetchedAt: lastFetchedAt,
      defaultBranch: fetched.defaultBranch,
      configWarning: fetched.warning !== undefined ? fetched.warning : null,
    });

    const response: GitHubRepoFetchResultMessage = {
      type: 'github/repo/fetch-result',
      requestId: requestId,
      ok: true,
      config: fetched.resolvedConfig,
      lastFetchedAt: lastFetchedAt,
      warning: fetched.warning,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] github/repo/fetch ok', fetched.resolvedConfig.tokensPath);
  } catch (error) {
    const errResponse: GitHubRepoFetchResultMessage = {
      type: 'github/repo/fetch-result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] github/repo/fetch failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

async function handleGitHubRepoPull(requestId: string, repoUrl: string): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  const token = await getToken(normalized);
  if (token === null) {
    const errResponse: GitHubRepoPullResultMessage = {
      type: 'github/repo/pull-result',
      requestId: requestId,
      ok: false,
      error: 'GitHub is not connected for this repository.',
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  const syncState = await getSyncState(normalized);
  if (
    syncState === null ||
    syncState.resolvedConfig === null ||
    syncState.resolvedConfig.tokensPath.length === 0
  ) {
    const errResponse: GitHubRepoPullResultMessage = {
      type: 'github/repo/pull-result',
      requestId: requestId,
      ok: false,
      error: 'Fetch latest first to resolve repo paths from fighub.json.',
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  try {
    const ownerRepo = parseOwnerRepo(normalized);
    const branch = syncState.resolvedConfig.designSystemBranch;
    const contents = await fetchRepoFileContents(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
      syncState.resolvedConfig.tokensPath,
      branch,
    );
    const cachedAt = new Date().toISOString();
    await figma.clientStorage.setAsync(repoTokensCacheKey(normalized), contents.text);
    await setSyncState(normalized, { lastPulledAt: cachedAt });

    const response: GitHubRepoPullResultMessage = {
      type: 'github/repo/pull-result',
      requestId: requestId,
      ok: true,
      kind: 'tokens',
      cachedAt: cachedAt,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] github/repo/pull ok', syncState.resolvedConfig.tokensPath);
  } catch (error) {
    let message = extractErrorMessage(error);
    if (error instanceof GitHubAuthError || error instanceof GitHubNotFoundError) {
      message = error.message;
    }
    const errResponse: GitHubRepoPullResultMessage = {
      type: 'github/repo/pull-result',
      requestId: requestId,
      ok: false,
      error: message,
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] github/repo/pull failed', message);
  }
}

async function handleGitHubRepoPush(requestId: string, repoUrl: string): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  const token = await getToken(normalized);
  if (token === null) {
    const errResponse: GitHubRepoPushResultMessage = {
      type: 'github/repo/push-result',
      requestId: requestId,
      ok: false,
      error: 'GitHub is not connected for this repository.',
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  const syncState = await getSyncState(normalized);
  if (syncState === null || syncState.resolvedConfig === null) {
    const errResponse: GitHubRepoPushResultMessage = {
      type: 'github/repo/push-result',
      requestId: requestId,
      ok: false,
      error: 'Fetch latest first to resolve export paths from fighub.json.',
    };
    figma.ui.postMessage(errResponse);
    return;
  }

  pluginLog('[main] push/started');

  try {
    const ownerRepo = parseOwnerRepo(normalized);
    const exportBase = normalizeExportBasePath(syncState.resolvedConfig.exportBasePath);
    const stubPath = exportBase + 'sync-stub.v1.json';
    const stubContent = JSON.stringify(
      {
        v: 1,
        kind: 'ops-program',
        meta: { generatedAt: new Date().toISOString(), source: 'fighub-push-stub' },
        steps: [],
      },
      null,
      2,
    );
    const headBranch = buildDefaultHeadBranch('push', new Date());
    const commitMessage = 'fighub: push updates from Figma';
    const prBody = buildPrBody({
      commitMessage: commitMessage,
      files: [{ path: stubPath, format: 'json' }],
      pluginVersion: '0.0.0',
      figmaFileUrl: figmaFileUrl(),
      figmaFileName: figma.root.name,
      contractKind: 'sync-stub',
    });

    const prResult = await createPullRequestFlow({
      token: token.accessToken,
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      baseBranch: syncState.resolvedConfig.designSystemBranch,
      headBranch: headBranch,
      commitMessage: commitMessage,
      prTitle: 'fighub: push updates from Figma',
      prBody: prBody,
      files: [{ path: stubPath, content: stubContent }],
    });

    const lastPushedAt = new Date().toISOString();
    await setSyncState(normalized, { lastPushedAt: lastPushedAt });

    const response: GitHubRepoPushResultMessage = {
      type: 'github/repo/push-result',
      requestId: requestId,
      ok: true,
      prUrl: prResult.prUrl,
      prNumber: prResult.prNumber,
      lastPushedAt: lastPushedAt,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] push/pr-opened', prResult.prUrl);
  } catch (error) {
    const message = extractErrorMessage(error);
    const errResponse: GitHubRepoPushResultMessage = {
      type: 'github/repo/push-result',
      requestId: requestId,
      ok: false,
      error: message,
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] push/error', message);
  }
}

async function handleGitHubTokenSave(
  repoUrl: string,
  accessToken: string,
  scope: string,
): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  await setToken(normalized, {
    accessToken: accessToken,
    scope: scope,
    createdAt: new Date().toISOString(),
    tokenType: 'bearer',
  });
  await setLastRepoUrl(normalized);
  await sendGitHubTokenStatus(normalized);
  pluginLog('[main] github/token/save ok', scope);
  await handleGitHubRepoFetch('token-save-fetch-' + String(Date.now()), normalized);
}

async function handleGitHubTokenClear(repoUrl: string): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  await clearToken(normalized);
  await clearSyncState(normalized);
  const lastRepo = await getLastRepoUrl();
  if (lastRepo === normalized) {
    await clearLastRepoUrl();
  }
  await sendGitHubTokenStatus(normalized);
  pluginLog('[main] github/token/clear ok');
}

async function handleGitHubSessionLoad(): Promise<void> {
  const lastRepo = await getLastRepoUrl();
  const response: GitHubSessionLoadedMessage = {
    type: 'github/session/loaded',
  };

  if (lastRepo !== null) {
    const token = await getToken(lastRepo);
    const syncState = await getSyncState(lastRepo);
    response.repoUrl = lastRepo;
    response.connected = token !== null;
    if (syncState !== null) {
      if (syncState.resolvedConfig !== null) {
        response.resolvedConfig = syncState.resolvedConfig;
      }
      response.lastFetchedAt = syncState.lastFetchedAt;
      response.lastPulledAt = syncState.lastPulledAt;
      response.lastPushedAt = syncState.lastPushedAt;
      response.configWarning = syncState.configWarning;
    }
    await sendGitHubTokenStatus(lastRepo);
  }

  figma.ui.postMessage(response);
}

function handleSnapshotRead(requestId: string): void {
  try {
    const registry = getRegistryFromSnapshot();
    const response: SnapshotReadResultMessage = {
      type: 'snapshot/read/result',
      requestId: requestId,
      ok: true,
      registry: registry,
    };
    figma.ui.postMessage(response);
    pluginLog(
      '[main] snapshot/read ok',
      String(Object.keys(registry.components).length) + ' entries',
    );
  } catch (error) {
    const errResponse: SnapshotReadResultMessage = {
      type: 'snapshot/read/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] snapshot/read failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

async function handleDriftDetectVariables(
  requestId: string,
  repoTokens: import('@detroitlabs/fighub-contracts').TokensV1,
): Promise<void> {
  try {
    const figmaCollections = await readFigmaVariableState();
    const figmaTokens = flattenFigmaVariableSnapshots(figmaCollections, { resolveAliases: true });
    const snapshotTokens = readVariableSnapshotTokens();
    const repoTokenMap = flattenRepoTokens(repoTokens);
    const result = detectVariableDrift({
      repoTokens: repoTokenMap,
      figmaTokens: figmaTokens,
      snapshotTokens: snapshotTokens,
    });
    const response: DriftDetectVariablesResultMessage = {
      type: 'drift/detect-variables/result',
      requestId: requestId,
      ok: true,
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog(
      '[main] drift/detect-variables ok',
      String(result.drifts.length) + ' drifts',
      String(result.syncedCount) + ' synced',
    );
  } catch (error) {
    const errResponse: DriftDetectVariablesResultMessage = {
      type: 'drift/detect-variables/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] drift/detect-variables failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

function collectFigmaComponentComparables(
  specNames: Record<string, boolean>,
): Record<string, ComponentComparable> {
  return collectFigmaComponentComparablesFromSnapshot(specNames);
}

async function handleDriftBuildReport(
  requestId: string,
  repoUrl: string,
  repoTokens: import('@detroitlabs/fighub-contracts').TokensV1,
  repoSpecs: { name: string; spec: import('@detroitlabs/fighub-contracts').ComponentSpecV1 }[],
  quickDetect?: boolean,
): Promise<void> {
  try {
    const report = await runDetectDrift({
      repoUrl: repoUrl,
      repoTokens: repoTokens,
      repoSpecs: repoSpecs,
      quickDetect: quickDetect,
    });
    const response: DriftBuildReportResultMessage = {
      type: 'drift/build-report/result',
      requestId: requestId,
      ok: true,
      report: report,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] drift/build-report ok', String(report.drifts.length) + ' drifts');
  } catch (error) {
    const errResponse: DriftBuildReportResultMessage = {
      type: 'drift/build-report/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] drift/build-report failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

function handleDriftDetectComponents(
  requestId: string,
  repoSpecs: { name: string; spec: import('@detroitlabs/fighub-contracts').ComponentSpecV1 }[],
  quickDetect?: boolean,
): void {
  try {
    const repoMap = buildRepoSpecMap(repoSpecs);
    const snapshotComponents = readSnapshotComponentComparables();
    const keySet: Record<string, boolean> = {};
    for (const key of Object.keys(repoMap)) {
      keySet[key] = true;
    }
    for (const key of Object.keys(snapshotComponents)) {
      keySet[key] = true;
    }
    const figmaComponents = collectFigmaComponentComparables(keySet);
    for (const key of Object.keys(figmaComponents)) {
      keySet[key] = true;
    }

    const options = quickDetect === true ? { quickDetect: true } : undefined;

    const result = detectComponentDrift({
      repoSpecs: repoMap,
      figmaComponents: figmaComponents,
      snapshotComponents: snapshotComponents,
      options: options,
    });

    const response: DriftDetectComponentsResultMessage = {
      type: 'drift/detect-components/result',
      requestId: requestId,
      ok: true,
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog(
      '[main] drift/detect-components ok',
      String(result.drifts.length) + ' drifts',
      String(result.syncedCount) + ' synced',
    );
  } catch (error) {
    const errResponse: DriftDetectComponentsResultMessage = {
      type: 'drift/detect-components/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] drift/detect-components failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

async function handleDriftDetectQuick(
  requestId: string,
  repoUrl: string,
  repoTokens: import('@detroitlabs/fighub-contracts').TokensV1,
  repoSpecs: { name: string; spec: import('@detroitlabs/fighub-contracts').ComponentSpecV1 }[],
): Promise<void> {
  try {
    const report = await runDetectDrift({
      repoUrl: repoUrl,
      repoTokens: repoTokens,
      repoSpecs: repoSpecs,
      quickDetect: true,
    });
    const response: DriftDetectQuickResultMessage = {
      type: 'drift/detect-quick/result',
      requestId: requestId,
      ok: true,
      summary: report.summary,
      report: report,
    };
    figma.ui.postMessage(response);
  } catch (error) {
    const errResponse: DriftDetectQuickResultMessage = {
      type: 'drift/detect-quick/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
  }
}

async function handleOpsDetectDrift(
  requestId: string,
  repoUrl: string,
  repoTokens: import('@detroitlabs/fighub-contracts').TokensV1,
  repoSpecs: { name: string; spec: import('@detroitlabs/fighub-contracts').ComponentSpecV1 }[],
  scope?: ('variables' | 'components')[],
): Promise<void> {
  try {
    const report = await runDetectDrift({
      repoUrl: repoUrl,
      repoTokens: repoTokens,
      repoSpecs: repoSpecs,
      quickDetect: false,
    });
    let filteredReport = report;
    if (scope !== undefined && scope.length > 0) {
      const includeVariables = scope.includes('variables');
      const includeComponents = scope.includes('components');
      const drifts = report.drifts.filter(function (entry) {
        if (entry.kind === 'variable') {
          return includeVariables;
        }
        return includeComponents;
      });
      filteredReport = Object.assign({}, report, { drifts: drifts });
    }
    const response: OpsDetectDriftResultMessage = {
      type: 'ops/detect-drift/result',
      requestId: requestId,
      ok: true,
      report: filteredReport,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] ops/detect-drift ok', String(filteredReport.drifts.length) + ' drifts');
  } catch (error) {
    const errResponse: OpsDetectDriftResultMessage = {
      type: 'ops/detect-drift/result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
  }
}

const DEFAULT_TOKENS_PATH = 'design/tokens.json';
const DEFAULT_SPECS_PATH = 'components/';

function buildFullSpecMap(
  specs:
    | { name: string; spec: import('@detroitlabs/fighub-contracts').ComponentSpecV1 }[]
    | undefined,
): Record<string, import('@detroitlabs/fighub-contracts').ComponentSpecV1> {
  const result: Record<string, import('@detroitlabs/fighub-contracts').ComponentSpecV1> = {};
  if (specs === undefined) {
    return result;
  }
  for (let i = 0; i < specs.length; i++) {
    result[specs[i].name] = specs[i].spec;
  }
  return result;
}

function figmaFileUrl(): string {
  const fileKey = figma.fileKey !== undefined && figma.fileKey !== null ? figma.fileKey : 'unknown';
  return 'https://www.figma.com/design/' + fileKey;
}

async function handleResolutionBulkPush(message: ResolutionBulkPushMessage): Promise<void> {
  const requestId = message.requestId;
  try {
    const normalized = normalizeRepoUrl(message.repoUrl);
    const syncState = await getSyncState(normalized);
    const tokensPath =
      syncState !== null &&
      syncState.resolvedConfig !== null &&
      syncState.resolvedConfig.tokensPath.length > 0
        ? syncState.resolvedConfig.tokensPath
        : message.tokensPath !== undefined && message.tokensPath.length > 0
          ? message.tokensPath
          : DEFAULT_TOKENS_PATH;
    const specsPath =
      syncState !== null &&
      syncState.resolvedConfig !== null &&
      syncState.resolvedConfig.specsPath.length > 0
        ? syncState.resolvedConfig.specsPath
        : message.specsPath !== undefined && message.specsPath.length > 0
          ? message.specsPath
          : DEFAULT_SPECS_PATH;
    const repoSpecMap = buildFullSpecMap(message.repoSpecs);
    const bulkResolutions = resolutionsForBulkPush(
      message.report,
      message.resolutions,
      message.driftIds,
    );
    const tokensWireFormat = message.tokensWireFormat === 'canonical' ? 'canonical' : 'dtcg';
    const staged = buildPushCommitFiles({
      report: message.report,
      resolutions: bulkResolutions,
      driftIds: message.driftIds,
      baseTokens: message.repoTokens,
      tokensPath: tokensPath,
      specsPath: specsPath,
      repoSpecs: repoSpecMap,
      tokensWireFormat: tokensWireFormat,
    });
    if (staged.length === 0) {
      const emptyResponse: ResolutionBulkResultMessage = {
        type: 'resolution/bulk-result',
        requestId: requestId,
        ok: false,
        error:
          'No push items in selection. Choose Push on conflicts, or select push drifts (checked rows with direction push).',
      };
      figma.ui.postMessage(emptyResponse);
      return;
    }

    const token = await getToken(normalized);
    if (token === null) {
      const authResponse: ResolutionBulkResultMessage = {
        type: 'resolution/bulk-result',
        requestId: requestId,
        ok: false,
        error: 'GitHub is not connected for this repository.',
      };
      figma.ui.postMessage(authResponse);
      return;
    }

    const ownerRepo = parseOwnerRepo(normalized);
    const baseBranch =
      syncState !== null &&
      syncState.resolvedConfig !== null &&
      syncState.resolvedConfig.designSystemBranch.length > 0
        ? syncState.resolvedConfig.designSystemBranch
        : syncState !== null && syncState.defaultBranch.length > 0
          ? syncState.defaultBranch
          : 'main';
    const headBranch = buildDefaultHeadBranch('drift-resolution', new Date());
    const commitMessage = 'FigHub: resolve design drift (push)';
    const prTitle = buildDriftReportPrTitle(message.report.summary);
    const prBody = buildDriftResolutionPrBody({
      commitMessage: commitMessage,
      files: staged.map(function (file) {
        return { path: file.path, format: file.format };
      }),
      pluginVersion: '0.0.0',
      figmaFileUrl: figmaFileUrl(),
      figmaFileName: figma.root.name,
      contractKind: 'drift-report',
      pushedCount: message.driftIds.length,
      changeTableMarkdown: renderDriftChangeTableMarkdown(message.report, message.driftIds),
    });

    const prResult = await createPullRequestFlow({
      token: token.accessToken,
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      baseBranch: baseBranch,
      headBranch: headBranch,
      commitMessage: commitMessage,
      prTitle: prTitle,
      prBody: prBody,
      files: staged.map(function (file) {
        return { path: file.path, content: file.content };
      }),
    });

    const successResponse: ResolutionBulkResultMessage = {
      type: 'resolution/bulk-result',
      requestId: requestId,
      ok: true,
      prUrl: prResult.prUrl,
    };
    figma.ui.postMessage(successResponse);
    pluginLog('[main] resolution/bulk-push ok', prResult.prUrl);
  } catch (error) {
    const errResponse: ResolutionBulkResultMessage = {
      type: 'resolution/bulk-result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] resolution/bulk-push failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

async function handleResolutionBulkPull(message: ResolutionBulkPullMessage): Promise<void> {
  const requestId = message.requestId;
  try {
    const repoSpecMap = buildFullSpecMap(message.repoSpecs);
    const appliedCount = await applyPullResolutions({
      report: message.report,
      resolutions: message.resolutions,
      driftIds: message.driftIds,
      repoSpecs: repoSpecMap,
    });
    const successResponse: ResolutionBulkResultMessage = {
      type: 'resolution/bulk-result',
      requestId: requestId,
      ok: true,
      appliedCount: appliedCount,
    };
    figma.ui.postMessage(successResponse);
    pluginLog('[main] resolution/bulk-pull ok', String(appliedCount) + ' applied');
  } catch (error) {
    const errResponse: ResolutionBulkResultMessage = {
      type: 'resolution/bulk-result',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
      appliedCount: 0,
    };
    figma.ui.postMessage(errResponse);
    pluginLog(
      '[main] resolution/bulk-pull failed',
      errResponse.error !== undefined ? errResponse.error : '',
    );
  }
}

async function handleGitHubOAuthStart(requestId: string, scope: string): Promise<void> {
  try {
    const device = await startDeviceFlow(scope);
    const response: GitHubOAuthDeviceCodeMessage = {
      type: 'github/oauth/device-code',
      requestId: requestId,
      ok: true,
      device: device,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] github/oauth/start ok', device.user_code);
  } catch (error) {
    const response: GitHubOAuthDeviceCodeMessage = {
      type: 'github/oauth/device-code',
      requestId: requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
    figma.ui.postMessage(response);
    pluginLog(
      '[main] github/oauth/start failed',
      response.error !== undefined ? response.error : '',
    );
  }
}

async function handleGitHubOAuthPoll(requestId: string, deviceCode: string): Promise<void> {
  try {
    const result = await pollDeviceFlow(deviceCode);
    const response: GitHubOAuthPollResultMessage = {
      type: 'github/oauth/poll-result',
      requestId: requestId,
      result: result,
    };
    figma.ui.postMessage(response);
  } catch (error) {
    const response: GitHubOAuthPollResultMessage = {
      type: 'github/oauth/poll-result',
      requestId: requestId,
      result: {
        status: 'error',
        error: 'fetch_failed',
        description: extractErrorMessage(error),
      },
    };
    figma.ui.postMessage(response);
  }
}

async function handleGitHubContentsFetch(
  requestId: string,
  repoUrl: string,
  path: string,
  ref?: string,
): Promise<void> {
  try {
    const normalized = normalizeRepoUrl(repoUrl);
    const token = await getToken(normalized);
    if (token === null) {
      const errResponse: GitHubContentsErrorMessage = {
        type: 'github/contents/error',
        requestId: requestId,
        message: 'GitHub is not connected for this repository.',
      };
      figma.ui.postMessage(errResponse);
      return;
    }
    const ownerRepo = parseOwnerRepo(normalized);
    const contents = await fetchRepoFileContents(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
      path,
      ref,
    );
    const response: GitHubContentsResultMessage = {
      type: 'github/contents/result',
      requestId: requestId,
      text: contents.text,
      sha: contents.sha,
    };
    figma.ui.postMessage(response);
  } catch (error) {
    let message = extractErrorMessage(error);
    if (error instanceof GitHubAuthError || error instanceof GitHubNotFoundError) {
      message = error.message;
    }
    const errResponse: GitHubContentsErrorMessage = {
      type: 'github/contents/error',
      requestId: requestId,
      message: message,
    };
    figma.ui.postMessage(errResponse);
  }
}

async function handleGitHubPrTestOpen(message: {
  requestId: string;
  repoUrl: string;
  headBranch: string;
  filePath: string;
  fileContent: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  baseBranch?: string;
}): Promise<void> {
  try {
    const normalized = normalizeRepoUrl(message.repoUrl);
    const token = await getToken(normalized);
    if (token === null) {
      figma.ui.postMessage({
        type: 'github/pr/test-result',
        requestId: message.requestId,
        ok: false,
        error: 'GitHub is not connected for this repository.',
      });
      return;
    }
    const ownerRepo = parseOwnerRepo(normalized);
    const syncState = await getSyncState(normalized);
    const baseBranch =
      message.baseBranch !== undefined && message.baseBranch.length > 0
        ? message.baseBranch
        : syncState !== null &&
            syncState.resolvedConfig !== null &&
            syncState.resolvedConfig.designSystemBranch.length > 0
          ? syncState.resolvedConfig.designSystemBranch
          : syncState !== null && syncState.defaultBranch.length > 0
            ? syncState.defaultBranch
            : 'main';
    const result = await createPullRequestFlow({
      token: token.accessToken,
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      baseBranch: baseBranch,
      headBranch: message.headBranch,
      commitMessage: message.commitMessage,
      prTitle: message.prTitle,
      prBody: message.prBody,
      files: [{ path: message.filePath, content: message.fileContent }],
    });
    figma.ui.postMessage({
      type: 'github/pr/test-result',
      requestId: message.requestId,
      ok: true,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
    });
    pluginLog('[main] github/pr/test-open ok', String(result.prNumber));
  } catch (error) {
    figma.ui.postMessage({
      type: 'github/pr/test-result',
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
    });
    pluginLog('[main] github/pr/test-open failed', extractErrorMessage(error));
  }
}

/** UI → main thread messages (Sprint 4 ops dispatch will extend this union). */
interface IoLoadedMessage {
  type: 'io/loaded';
  kind: ContractKind;
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function isIoLoadedMessage(message: unknown): message is IoLoadedMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'io/loaded' && typeof message.kind === 'string';
}

async function handlePushVariables(
  tokens: import('@detroitlabs/fighub-contracts').TokensV1,
): Promise<void> {
  try {
    const outcome = await pushTokens(tokens);
    const response: PushResultMessage = {
      type: 'push/result',
      result: {
        created: outcome.created,
        updated: outcome.updated,
        skipped: outcome.skipped,
        errors: outcome.errors,
        passes: outcome.passes,
        evc: outcome.evc,
        totalDurationMs: outcome.totalDurationMs,
      },
      audit: outcome.audit,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] push/variables done', String(outcome.totalDurationMs) + 'ms', {
      created: outcome.created,
      updated: outcome.updated,
      skipped: outcome.skipped,
      errors: outcome.errors.length,
      auditPassed: outcome.audit.passed,
    });
  } catch (error) {
    const errResponse: PushErrorMessage = {
      type: 'push/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] push/variables failed', errResponse.message);
  }
}

async function handleCanvasBuildPage(
  page: 'primitives' | 'theme' | 'text-styles' | 'token-overview' | 'layout' | 'effects',
  tokens: import('@detroitlabs/fighub-contracts').TokensV1,
): Promise<void> {
  try {
    const target = { pageSlug: page };
    let result;
    if (page === 'primitives') {
      result = await buildPrimitivesPage(tokens, target);
    } else if (page === 'theme') {
      result = await buildThemePage(tokens, target);
    } else {
      const ctx: CanvasBuildContext = { tokens: tokens };
      if (page === 'text-styles') {
        result = await buildTextStylesPage(ctx);
      } else if (page === 'token-overview') {
        result = await buildTokenOverviewPage(ctx);
      } else if (page === 'layout') {
        result = await buildLayoutPage(ctx);
      } else {
        result = await buildEffectsPage(ctx);
      }
    }
    const response: CanvasBuildResultMessage = {
      type: 'canvas/result',
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] canvas/build-page done', page, String(result.durationMs) + 'ms', {
      tableCount: result.tableCount,
      swatchCount: result.swatchCount,
    });
  } catch (error) {
    const errResponse: CanvasBuildErrorMessage = {
      type: 'canvas/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] canvas/build-page failed', page, errResponse.message);
  }
}

function rebuildLoadedDocument(doc: SerializableDocument): LoadedDocument {
  return {
    kind: doc.kind,
    payload: doc.payload,
    sourceMeta: {
      port: 'paste',
      receivedAt: new Date().toISOString(),
      charLength: 0,
    },
    rawSnippet: '',
  };
}

function sinkLogDetail(result: { ok: boolean; error?: string; message: string }): string {
  if (result.ok) {
    return 'ok';
  }
  if (result.error !== undefined && result.error !== '') {
    return result.error;
  }
  return result.message;
}

async function handleSinkOutputPage(
  requestId: string,
  doc: SerializableDocument,
  options: FormatOptions,
): Promise<void> {
  try {
    const loaded = rebuildLoadedDocument(doc);
    const prepared = prepareSinkContent(loaded, options);
    const result = await writeToOutputPage(prepared, options);
    const response: SinkResultMessage = {
      type: 'sink/result',
      requestId: requestId,
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] sink/output-page done', sinkLogDetail(result));
  } catch (error) {
    const errResponse: SinkErrorMessage = {
      type: 'sink/error',
      requestId: requestId,
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] sink/output-page failed', errResponse.message);
  }
}

function exportSinkResultFromSinkResult(
  requestId: string,
  result: SinkResult,
): ExportSinkResultMessage {
  return {
    type: 'export/sink-result',
    requestId: requestId,
    sink: result.sink,
    ok: result.ok,
    message: result.message,
    error: result.error,
    code: result.code,
  };
}

function exportBySinkFromSinkResult(result: SinkResult): ExportBySinkResult {
  return {
    ok: result.ok,
    message: result.message,
    error: result.error,
    code: result.code,
  };
}

function githubPrOpenedLogValue(result: SinkResult): string {
  const hashIndex = result.message.indexOf('#');
  if (hashIndex >= 0) {
    return result.message.slice(hashIndex + 1);
  }
  return result.message;
}

async function handleExportRun(message: ExportRunMessage): Promise<void> {
  const bySink: Partial<Record<SinkId, ExportBySinkResult>> = {};
  const loaded = rebuildLoadedDocument(message.doc);
  const prepared = prepareSinkContent(loaded, message.formatOptions);

  for (let i = 0; i < message.sinks.length; i++) {
    const sink = message.sinks[i];
    let result: SinkResult | null = null;

    if (sink === 'output-page') {
      try {
        result = await writeToOutputPage(prepared, message.formatOptions);
        pluginLog('[main] export/output-page done', sinkLogDetail(result));
      } catch (error) {
        result = {
          ok: false,
          sink: 'output-page',
          message: 'Output page export failed',
          error: extractErrorMessage(error),
        };
        pluginLog(
          '[main] export/output-page failed',
          result.error !== undefined ? result.error : '',
        );
      }
    } else if (sink === 'plugin-data') {
      try {
        result = await writeToPluginData(loaded, prepared);
        pluginLog('[main] export/plugin-data done', sinkLogDetail(result));
      } catch (error) {
        result = {
          ok: false,
          sink: 'plugin-data',
          message: 'Plugin data export failed',
          error: extractErrorMessage(error),
        };
        pluginLog(
          '[main] export/plugin-data failed',
          result.error !== undefined ? result.error : '',
        );
      }
    } else if (sink === 'github-pr') {
      if (message.githubPR === undefined) {
        result = {
          ok: false,
          sink: 'github-pr',
          message: 'GitHub PR options missing.',
          error: 'githubPR payload is required when github-pr sink is selected.',
        };
      } else {
        const ctx: GithubPRSinkContext = {
          files: message.githubPR.files,
          contractKind: message.githubPR.contractKind,
          repoUrl: message.githubPR.repoUrl,
          options: message.githubPR.githubPROptions,
          figmaFileKey:
            figma.fileKey !== undefined && figma.fileKey !== null ? figma.fileKey : 'unknown',
          figmaFileName: figma.root.name,
        };
        result = await executeGithubPRSink(ctx);
        if (result.ok) {
          pluginLog('github-pr:opened', githubPrOpenedLogValue(result));
        } else {
          pluginLog('[main] export/github-pr failed', sinkLogDetail(result));
        }
      }
    }

    if (result !== null) {
      figma.ui.postMessage(exportSinkResultFromSinkResult(message.requestId, result));
      bySink[result.sink] = exportBySinkFromSinkResult(result);
    }
  }

  const complete: ExportCompleteMessage = {
    type: 'export/complete',
    requestId: message.requestId,
    bySink: bySink,
  };
  figma.ui.postMessage(complete);
}

async function handleSinkPluginData(
  requestId: string,
  doc: SerializableDocument,
  options: FormatOptions,
): Promise<void> {
  try {
    const loaded = rebuildLoadedDocument(doc);
    const prepared = prepareSinkContent(loaded, options);
    const result = await writeToPluginData(loaded, prepared);
    const response: SinkResultMessage = {
      type: 'sink/result',
      requestId: requestId,
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] sink/plugin-data done', sinkLogDetail(result));
  } catch (error) {
    const errResponse: SinkErrorMessage = {
      type: 'sink/error',
      requestId: requestId,
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] sink/plugin-data failed', errResponse.message);
  }
}

async function handleCanvasBench(
  page: 'primitives' | 'theme' | 'text-styles' | 'token-overview' | 'layout' | 'effects',
  tokens: import('@detroitlabs/fighub-contracts').TokensV1,
  label?: string,
): Promise<void> {
  try {
    const target = { pageSlug: page };
    const benchLabel = label !== undefined && label !== '' ? label : 'canvas-bench-' + page;
    const result = await runCanvasBench(benchLabel, function () {
      if (page === 'primitives') {
        return buildPrimitivesPage(tokens, target).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'theme') {
        return buildThemePage(tokens, target).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      const ctx: CanvasBuildContext = { tokens: tokens };
      if (page === 'text-styles') {
        return buildTextStylesPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'token-overview') {
        return buildTokenOverviewPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'layout') {
        return buildLayoutPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      return buildEffectsPage(ctx).then(function (buildResult) {
        return { swatchCount: buildResult.swatchCount };
      });
    });
    const response: CanvasBenchResultMessage = {
      type: 'canvas/bench-result',
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] canvas/bench done', page, String(result.totalDurationMs) + 'ms');
  } catch (error) {
    const errResponse: CanvasBuildErrorMessage = {
      type: 'canvas/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] canvas/bench failed', page, errResponse.message);
  }
}

figma.ui.onmessage = (message: unknown) => {
  if (isSnapshotReadMessage(message)) {
    handleSnapshotRead(message.requestId);
    return;
  }

  if (isDriftDetectVariablesMessage(message)) {
    handleDriftDetectVariables(message.requestId, message.repoTokens).catch(function (
      error: unknown,
    ) {
      const errResponse: DriftDetectVariablesResultMessage = {
        type: 'drift/detect-variables/result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog(
        '[main] drift/detect-variables unhandled',
        errResponse.error !== undefined ? errResponse.error : '',
      );
    });
    return;
  }

  if (isDriftDetectComponentsMessage(message)) {
    handleDriftDetectComponents(message.requestId, message.repoSpecs, message.quickDetect);
    return;
  }

  if (isDriftBuildReportMessage(message)) {
    handleDriftBuildReport(
      message.requestId,
      message.repoUrl,
      message.repoTokens,
      message.repoSpecs,
      message.quickDetect,
    ).catch(function (error: unknown) {
      const errResponse: DriftBuildReportResultMessage = {
        type: 'drift/build-report/result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog(
        '[main] drift/build-report unhandled',
        errResponse.error !== undefined ? errResponse.error : '',
      );
    });
    return;
  }

  if (isDriftDetectQuickMessage(message)) {
    handleDriftDetectQuick(
      message.requestId,
      message.repoUrl,
      message.repoTokens,
      message.repoSpecs,
    ).catch(function (error: unknown) {
      const errResponse: DriftDetectQuickResultMessage = {
        type: 'drift/detect-quick/result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isOpsDetectDriftMessage(message)) {
    handleOpsDetectDrift(
      message.requestId,
      message.repoUrl,
      message.repoTokens,
      message.repoSpecs,
      message.scope,
    ).catch(function (error: unknown) {
      const errResponse: OpsDetectDriftResultMessage = {
        type: 'ops/detect-drift/result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isResolutionBulkPushMessage(message)) {
    handleResolutionBulkPush(message).catch(function (error: unknown) {
      const errResponse: ResolutionBulkResultMessage = {
        type: 'resolution/bulk-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isResolutionBulkPullMessage(message)) {
    handleResolutionBulkPull(message).catch(function (error: unknown) {
      const errResponse: ResolutionBulkResultMessage = {
        type: 'resolution/bulk-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubOAuthStartMessage(message)) {
    handleGitHubOAuthStart(message.requestId, message.scope).catch(function (error: unknown) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubOAuthPollMessage(message)) {
    handleGitHubOAuthPoll(message.requestId, message.deviceCode).catch(function (error: unknown) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubTokenSaveMessage(message)) {
    handleGitHubTokenSave(message.repoUrl, message.accessToken, message.scope).catch(function (
      error: unknown,
    ) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubTokenClearMessage(message)) {
    handleGitHubTokenClear(message.repoUrl).catch(function (error: unknown) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubTokenProbeMessage(message)) {
    sendGitHubTokenStatus(message.repoUrl).catch(function (error: unknown) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubSessionLoadMessage(message)) {
    handleGitHubSessionLoad().catch(function (error: unknown) {
      const errResponse: GitHubErrorMessage = {
        type: 'github/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubContentsFetchMessage(message)) {
    handleGitHubContentsFetch(message.requestId, message.repoUrl, message.path, message.ref).catch(
      function (error: unknown) {
        const errResponse: GitHubContentsErrorMessage = {
          type: 'github/contents/error',
          requestId: message.requestId,
          message: extractErrorMessage(error),
        };
        figma.ui.postMessage(errResponse);
      },
    );
    return;
  }

  if (isGitHubRepoFetchMessage(message)) {
    handleGitHubRepoFetch(message.requestId, message.repoUrl).catch(function (error: unknown) {
      const errResponse: GitHubRepoFetchResultMessage = {
        type: 'github/repo/fetch-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubRepoPullMessage(message)) {
    handleGitHubRepoPull(message.requestId, message.repoUrl).catch(function (error: unknown) {
      const errResponse: GitHubRepoPullResultMessage = {
        type: 'github/repo/pull-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubRepoPushMessage(message)) {
    handleGitHubRepoPush(message.requestId, message.repoUrl).catch(function (error: unknown) {
      const errResponse: GitHubRepoPushResultMessage = {
        type: 'github/repo/push-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
    });
    return;
  }

  if (isGitHubPrTestOpenMessage(message)) {
    handleGitHubPrTestOpen(message).catch(function (error: unknown) {
      figma.ui.postMessage({
        type: 'github/pr/test-result',
        requestId: message.requestId,
        ok: false,
        error: extractErrorMessage(error),
      });
    });
    return;
  }

  if (isBootstrapRunMessage(message)) {
    runBootstrap(message.tokens, message.options).catch(function (error: unknown) {
      figma.ui.postMessage({
        type: 'bootstrap/error',
        message: extractErrorMessage(error),
      });
      pluginLog('[main] bootstrap/run unhandled', extractErrorMessage(error));
    });
    return;
  }

  if (isScaffoldRunMessage(message)) {
    runScaffoldComponent(message.spec, message.options).catch(function (error: unknown) {
      figma.ui.postMessage({
        type: 'scaffold/error',
        message: extractErrorMessage(error),
      });
      pluginLog('[main] scaffold/run unhandled', extractErrorMessage(error));
    });
    return;
  }

  // Dev/bench: direct push handler retained until Sprint 4 ops dispatch replaces it.
  if (isPushVariablesMessage(message)) {
    handlePushVariables(message.tokens).catch(function (error: unknown) {
      const errResponse: PushErrorMessage = {
        type: 'push/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] push/variables unhandled', errResponse.message);
    });
    return;
  }

  if (isCanvasBuildPageMessage(message)) {
    handleCanvasBuildPage(message.page, message.tokens).catch(function (error: unknown) {
      const errResponse: CanvasBuildErrorMessage = {
        type: 'canvas/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] canvas/build-page unhandled', errResponse.message);
    });
    return;
  }

  if (isCanvasBenchMessage(message)) {
    handleCanvasBench(message.page, message.tokens, message.label).catch(function (error: unknown) {
      const errResponse: CanvasBuildErrorMessage = {
        type: 'canvas/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] canvas/bench unhandled', errResponse.message);
    });
    return;
  }

  if (isSinkOutputPageMessage(message)) {
    handleSinkOutputPage(message.requestId, message.doc, message.options).catch(function (
      error: unknown,
    ) {
      const errResponse: SinkErrorMessage = {
        type: 'sink/error',
        requestId: message.requestId,
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] sink/output-page unhandled', errResponse.message);
    });
    return;
  }

  if (isSinkPluginDataMessage(message)) {
    handleSinkPluginData(message.requestId, message.doc, message.options).catch(function (
      error: unknown,
    ) {
      const errResponse: SinkErrorMessage = {
        type: 'sink/error',
        requestId: message.requestId,
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] sink/plugin-data unhandled', errResponse.message);
    });
    return;
  }

  if (isExportRunMessage(message)) {
    handleExportRun(message).catch(function (error: unknown) {
      const errMessage = extractErrorMessage(error);
      figma.ui.postMessage({
        type: 'export/sink-result',
        requestId: message.requestId,
        sink: 'github-pr',
        ok: false,
        message: 'Export failed',
        error: errMessage,
      });
      figma.ui.postMessage({
        type: 'export/complete',
        requestId: message.requestId,
        bySink: {},
      });
      pluginLog('[main] export/run unhandled', errMessage);
    });
    return;
  }

  if (!isIoLoadedMessage(message)) {
    return;
  }
  // Sprint 4 (ops-protocol) wires loaded documents into the deterministic core.
  pluginLog('[main] io/loaded', message.kind);
};
