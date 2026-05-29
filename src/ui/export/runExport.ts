import { buildDefaultHeadBranch } from '@/io/github/branchName';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import type { ExportGithubPRPayload, ExportMainSinkId } from '@/io/messages/export';
import { runSink } from '@/io/sinks';
import type { FormatOptions, SinkId } from '@/io/sinks/types';
import type { LoadedDocument } from '@/io/sources/types';

import { waitForExportMainResults } from './exportMessageListener';
import type { ExportSheetAction, ExportSheetState } from './exportSheetReducer';
import { buildExportFiles } from './serializeForExport';
import type { ContractDocument, ExportResults } from './types';

const UI_SINK_IDS: SinkId[] = ['download', 'clipboard'];
const MAIN_SINK_IDS: ExportMainSinkId[] = ['output-page', 'plugin-data', 'github-pr'];

export type ExportDispatch = (action: ExportSheetAction) => void;

export interface RunExportGithubOptions {
  repoUrl: string;
  baseBranch?: string;
}

export interface RunExportOptions {
  onComplete?: (results: ExportResults) => void;
  github?: RunExportGithubOptions;
  /** Test seam for postMessage. */
  postMessage?: (message: unknown) => void;
  /** Test seam for runSink. */
  runSinkFn?: typeof runSink;
}

function contractToLoaded(doc: ContractDocument): LoadedDocument {
  return {
    kind: doc.kind as LoadedDocument['kind'],
    payload: doc.payload,
    sourceMeta: {
      port: 'paste',
      receivedAt: new Date().toISOString(),
      charLength: 0,
    },
    rawSnippet: '',
  };
}

function buildFormatOptions(state: ExportSheetState): FormatOptions {
  const jsonSelected = state.formats.json === true;
  const mdSelected = state.formats.md === true;
  let format: FormatOptions['format'];
  if (jsonSelected && mdSelected) {
    format = 'both';
  } else if (jsonSelected) {
    format = 'json';
  } else {
    format = 'md';
  }

  const options: FormatOptions = {
    format: format,
    baseName: state.path,
  };
  if (format === 'both') {
    options.primaryFormat = 'md';
  }
  return options;
}

function selectedUiSinks(state: ExportSheetState): SinkId[] {
  const selected: SinkId[] = [];
  for (let i = 0; i < UI_SINK_IDS.length; i++) {
    const sink = UI_SINK_IDS[i];
    if (state.sinks[sink] === true) {
      selected.push(sink);
    }
  }
  return selected;
}

function selectedMainSinks(state: ExportSheetState): ExportMainSinkId[] {
  const selected: ExportMainSinkId[] = [];
  for (let i = 0; i < MAIN_SINK_IDS.length; i++) {
    const sink = MAIN_SINK_IDS[i];
    if (state.sinks[sink] === true) {
      selected.push(sink);
    }
  }
  return selected;
}

interface SinkResultRecord {
  dispatch: ExportDispatch;
  results: ExportResults;
}

function recordSinkResult(
  ctx: SinkResultRecord,
  sink: SinkId,
  ok: boolean,
  message?: string,
  error?: string,
): void {
  ctx.results.bySink[sink] = {
    ok: ok,
    message: message,
    error: error,
  };
  ctx.dispatch({
    type: 'sink-result',
    sink: sink,
    ok: ok,
    message: message,
    error: error,
  });
}

function buildGithubPRPayload(
  doc: ContractDocument,
  files: { path: string; content: string; format: 'json' | 'md' }[],
  github: RunExportGithubOptions,
): ExportGithubPRPayload | null {
  try {
    const repoUrl = normalizeRepoUrl(github.repoUrl);
    const ownerRepo = parseOwnerRepo(repoUrl);
    const contractKind = doc.kind;
    const headBranch = buildDefaultHeadBranch(contractKind, new Date());
    const commitMessage = 'fighub: export ' + contractKind;
    const prFiles: { path: string; content: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      prFiles.push({ path: file.path, content: file.content });
    }
    return {
      repoUrl: repoUrl,
      contractKind: contractKind,
      files: prFiles,
      githubPROptions: {
        owner: ownerRepo.owner,
        repo: ownerRepo.repo,
        baseBranch:
          github.baseBranch !== undefined && github.baseBranch !== '' ? github.baseBranch : 'main',
        commitMessage: commitMessage,
        headBranch: headBranch,
        prTitle: commitMessage,
      },
    };
  } catch {
    return null;
  }
}

async function runUiSinks(
  sinks: SinkId[],
  loaded: LoadedDocument,
  formatOptions: FormatOptions,
  ctx: SinkResultRecord,
  runSinkFn: typeof runSink,
): Promise<void> {
  if (sinks.length === 0) {
    return;
  }

  const tasks: Promise<void>[] = [];
  for (let i = 0; i < sinks.length; i++) {
    const sink = sinks[i];
    tasks.push(
      runSinkFn(sink, loaded, formatOptions)
        .then(function (result) {
          recordSinkResult(ctx, result.sink, result.ok, result.message, result.error);
        })
        .catch(function (error: unknown) {
          const errMessage = error instanceof Error ? error.message : String(error);
          recordSinkResult(ctx, sink, false, undefined, errMessage);
        }),
    );
  }

  await Promise.allSettled(tasks);
}

function waitForMainExport(requestId: string, ctx: SinkResultRecord): Promise<void> {
  return new Promise(function (resolve) {
    waitForExportMainResults(requestId, {
      onSinkResult: function (message) {
        recordSinkResult(ctx, message.sink, message.ok, message.message, message.error);
      },
      onComplete: function () {
        resolve();
      },
    });
  });
}

async function runMainSinks(
  requestId: string,
  doc: ContractDocument,
  loaded: LoadedDocument,
  state: ExportSheetState,
  formatOptions: FormatOptions,
  files: { path: string; content: string; format: 'json' | 'md' }[],
  ctx: SinkResultRecord,
  options: RunExportOptions | undefined,
): Promise<void> {
  const mainSinks = selectedMainSinks(state);
  if (mainSinks.length === 0) {
    return;
  }

  let githubPR: ExportGithubPRPayload | undefined;
  let githubPrFailed = false;
  if (state.sinks['github-pr'] === true) {
    if (options?.github !== undefined) {
      const payload = buildGithubPRPayload(doc, files, options.github);
      if (payload === null) {
        githubPrFailed = true;
        recordSinkResult(
          ctx,
          'github-pr',
          false,
          'Invalid GitHub repository URL.',
          'Could not build GitHub PR export payload.',
        );
      } else {
        githubPR = payload;
      }
    } else {
      githubPrFailed = true;
      recordSinkResult(
        ctx,
        'github-pr',
        false,
        'Connect GitHub in Settings to open a PR.',
        'GitHub repository URL is required for PR export.',
      );
    }
  }

  const sinksForMessage: ExportMainSinkId[] = [];
  for (let i = 0; i < mainSinks.length; i++) {
    const sink = mainSinks[i];
    if (sink === 'github-pr' && githubPrFailed) {
      continue;
    }
    sinksForMessage.push(sink);
  }

  if (sinksForMessage.length === 0) {
    return;
  }

  const postMessage =
    options?.postMessage !== undefined
      ? options.postMessage
      : function (message: unknown) {
          parent.postMessage(message, '*');
        };

  const mainPromise = waitForMainExport(requestId, ctx);

  const pluginMessage: Record<string, unknown> = {
    type: 'export/run',
    requestId: requestId,
    sinks: sinksForMessage,
    doc: { kind: loaded.kind, payload: loaded.payload },
    formatOptions: formatOptions,
    files: files,
  };
  if (githubPR !== undefined) {
    pluginMessage.githubPR = githubPR;
  }

  postMessage({ pluginMessage: pluginMessage });
  await mainPromise;
}

export async function runExport(
  doc: ContractDocument,
  state: ExportSheetState,
  dispatch: ExportDispatch,
  options?: RunExportOptions,
): Promise<void> {
  const requestId = 'export-' + String(Date.now());
  dispatch({ type: 'start-export', requestId: requestId });

  const resultCtx: SinkResultRecord = {
    dispatch: dispatch,
    results: { requestId: requestId, bySink: {} },
  };

  const loaded = contractToLoaded(doc);
  const formatOptions = buildFormatOptions(state);
  const files = buildExportFiles(doc, state.formats, state.path);
  const runSinkFn = options?.runSinkFn !== undefined ? options.runSinkFn : runSink;

  const uiSinks = selectedUiSinks(state);
  await Promise.all([
    runUiSinks(uiSinks, loaded, formatOptions, resultCtx, runSinkFn),
    runMainSinks(requestId, doc, loaded, state, formatOptions, files, resultCtx, options),
  ]);

  dispatch({ type: 'complete' });

  if (options?.onComplete !== undefined) {
    options.onComplete(resultCtx.results);
  }
}
