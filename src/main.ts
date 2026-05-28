// Figma plugin main-thread entry. ES2017 target (Figma's QuickJS sandbox rejects
// ES2020+ syntax — optional chaining, nullish coalescing, replaceAll). The UI HTML
// is injected at build time via Vite's `define.__html__`, which reads the finalized
// `dist/ui.html` produced by the UI build pass — see vite.config.ts.

import { runBootstrap } from '@/core/bootstrap/runBootstrap';
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
import {
  isPushVariablesMessage,
  type PushErrorMessage,
  type PushResultMessage,
} from '@/io/messages/push';
import {
  isGitHubContentsFetchMessage,
  isGitHubOAuthPollMessage,
  isGitHubOAuthStartMessage,
  isGitHubTokenClearMessage,
  isGitHubTokenProbeMessage,
  isGitHubTokenSaveMessage,
  type GitHubContentsErrorMessage,
  type GitHubContentsResultMessage,
  type GitHubErrorMessage,
  type GitHubOAuthDeviceCodeMessage,
  type GitHubOAuthPollResultMessage,
  type GitHubTokenStatusMessage,
} from '@/io/messages/github';
import { fetchRepoFileContents, GitHubAuthError, GitHubNotFoundError } from '@/io/github/contents';
import { createPullRequestFlow } from '@/io/github/createPullRequestFlow';
import { pollDeviceFlow, startDeviceFlow } from '@/io/github/oauth';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import {
  clearConfig,
  clearToken,
  getConfig,
  getToken,
  setConfig,
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
  let normalized = repoUrl;
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
  const config = await getConfig(normalized);
  const status: GitHubTokenStatusMessage = {
    type: 'github/token/status',
    repoUrl: normalized,
    connected: token !== null,
    scope: token !== null ? token.scope : undefined,
    tokenPreview: token !== null ? tokenPreview(token.accessToken) : undefined,
    tokensPath: config !== null ? config.tokensPath : undefined,
  };
  figma.ui.postMessage(status);
}

async function handleGitHubTokenSave(
  repoUrl: string,
  accessToken: string,
  scope: string,
  tokensPath?: string,
): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  await setToken(normalized, {
    accessToken: accessToken,
    scope: scope,
    createdAt: new Date().toISOString(),
    tokenType: 'bearer',
  });
  const existingConfig = await getConfig(normalized);
  const pathValue =
    tokensPath !== undefined && tokensPath.length > 0
      ? tokensPath
      : existingConfig !== null
        ? existingConfig.tokensPath
        : 'design/tokens.json';
  await setConfig(normalized, {
    tokensPath: pathValue,
    defaultBranch: existingConfig !== null ? existingConfig.defaultBranch : undefined,
    exportBasePath: existingConfig !== null ? existingConfig.exportBasePath : undefined,
  });
  await sendGitHubTokenStatus(normalized);
  pluginLog('[main] github/token/save ok', scope);
}

async function handleGitHubTokenClear(repoUrl: string): Promise<void> {
  const normalized = normalizeRepoUrl(repoUrl);
  await clearToken(normalized);
  await clearConfig(normalized);
  await sendGitHubTokenStatus(normalized);
  pluginLog('[main] github/token/clear ok');
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
    pluginLog('[main] github/oauth/start failed', response.error !== undefined ? response.error : '');
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
    const config = await getConfig(normalized);
    const baseBranch =
      message.baseBranch !== undefined && message.baseBranch.length > 0
        ? message.baseBranch
        : config !== null && config.defaultBranch !== undefined
          ? config.defaultBranch
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
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
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
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
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
        pluginLog('[main] export/output-page failed', result.error !== undefined ? result.error : '');
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
        pluginLog('[main] export/plugin-data failed', result.error !== undefined ? result.error : '');
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
          figmaFileKey: figma.fileKey,
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
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
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
    handleGitHubTokenSave(
      message.repoUrl,
      message.accessToken,
      message.scope,
      message.tokensPath,
    ).catch(function (error: unknown) {
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

  if (isGitHubContentsFetchMessage(message)) {
    handleGitHubContentsFetch(
      message.requestId,
      message.repoUrl,
      message.path,
      message.ref,
    ).catch(function (error: unknown) {
      const errResponse: GitHubContentsErrorMessage = {
        type: 'github/contents/error',
        requestId: message.requestId,
        message: extractErrorMessage(error),
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
    handleSinkOutputPage(message.requestId, message.doc, message.options).catch(
      function (error: unknown) {
        const errResponse: SinkErrorMessage = {
          type: 'sink/error',
          requestId: message.requestId,
          message: extractErrorMessage(error),
        };
        figma.ui.postMessage(errResponse);
        pluginLog('[main] sink/output-page unhandled', errResponse.message);
      },
    );
    return;
  }

  if (isSinkPluginDataMessage(message)) {
    handleSinkPluginData(message.requestId, message.doc, message.options).catch(
      function (error: unknown) {
        const errResponse: SinkErrorMessage = {
          type: 'sink/error',
          requestId: message.requestId,
          message: extractErrorMessage(error),
        };
        figma.ui.postMessage(errResponse);
        pluginLog('[main] sink/plugin-data unhandled', errResponse.message);
      },
    );
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
