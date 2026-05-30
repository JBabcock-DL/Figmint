import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import {
  runScaffoldComponent,
  type ScaffoldRunOutcome,
} from '@/core/components/scaffold/runScaffold';
import { getRegistryFromSnapshot } from '@/core/sync/snapshotStore';
import { pluginLog } from '@/core/pluginLog';
import {
  clearCatalogDiscoveryCache,
  discoverCatalogEntries,
} from '@/io/github/catalogDiscovery';
import { fetchRepoFileContents } from '@/io/github/contents';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import { getSyncState, getToken } from '@/io/github/storage';
import {
  CATALOG_DISCOVER_RESULT,
  CATALOG_SCAFFOLD_BATCH_PROGRESS,
  CATALOG_SCAFFOLD_BATCH_RESULT,
  type CatalogDiscoverMessage,
  type CatalogDiscoverResultMessage,
  type CatalogScaffoldBatchMessage,
  type CatalogScaffoldBatchProgressMessage,
  type CatalogScaffoldBatchResultMessage,
} from '@/io/messages/catalog';
import { parseTextToDocument } from '@/io/sources/parseText';
import type { LoadedDocument, GitHubSourceMeta } from '@/io/sources/types';

const MAX_BATCH_SIZE = 20;
const DEFAULT_SPECS_PATH = 'components/';
const DEFAULT_BRANCH = 'main';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as Record<'message', unknown>).message;
    return String(message);
  }
  return String(error);
}

function isComponentSpecDocument(
  doc: LoadedDocument<unknown> | { kind: string; message: string },
): doc is LoadedDocument<ComponentSpecV1> {
  return 'payload' in doc && doc.kind === 'component-spec';
}

async function loadComponentSpecFromRepo(
  repoUrl: string,
  token: string,
  specPath: string,
  branch: string,
): Promise<LoadedDocument<ComponentSpecV1> | { kind: 'error'; message: string }> {
  const ownerRepo = parseOwnerRepo(repoUrl);
  try {
    const contents = await fetchRepoFileContents(
      token,
      ownerRepo.owner,
      ownerRepo.repo,
      specPath,
      branch,
    );
    const doc = parseTextToDocument(contents.text, { source: 'paste' }, function (_kind, _charLength) {
      const meta: GitHubSourceMeta = {
        port: 'github',
        repoUrl: repoUrl,
        path: specPath,
        ref: branch,
        sha: contents.sha,
        receivedAt: new Date().toISOString(),
      };
      return meta;
    });
    if (!('payload' in doc)) {
      return { kind: 'error', message: doc.message };
    }
    if (doc.kind !== 'component-spec') {
      return { kind: 'error', message: 'Not a component-spec document.' };
    }
    return doc as LoadedDocument<ComponentSpecV1>;
  } catch (error) {
    return { kind: 'error', message: extractErrorMessage(error) };
  }
}

async function resolveDiscoveryConfig(
  repoUrl: string,
  overrides?: { specsPath?: string; designSystemBranch?: string },
): Promise<{ specsPath: string; designSystemBranch: string }> {
  let specsPath = DEFAULT_SPECS_PATH;
  let designSystemBranch = DEFAULT_BRANCH;

  if (overrides !== undefined && overrides.specsPath !== undefined && overrides.specsPath.length > 0) {
    specsPath = overrides.specsPath;
  }
  if (
    overrides !== undefined &&
    overrides.designSystemBranch !== undefined &&
    overrides.designSystemBranch.length > 0
  ) {
    designSystemBranch = overrides.designSystemBranch;
  }

  const syncState = await getSyncState(repoUrl);
  if (syncState !== null && syncState.resolvedConfig !== null) {
    if (overrides === undefined || overrides.specsPath === undefined || overrides.specsPath.length === 0) {
      specsPath = syncState.resolvedConfig.specsPath;
    }
    if (
      overrides === undefined ||
      overrides.designSystemBranch === undefined ||
      overrides.designSystemBranch.length === 0
    ) {
      designSystemBranch = syncState.resolvedConfig.designSystemBranch;
    }
  }

  return { specsPath: specsPath, designSystemBranch: designSystemBranch };
}

function postDiscoverResult(result: CatalogDiscoverResultMessage): void {
  figma.ui.postMessage(result);
}

function postBatchProgress(message: CatalogScaffoldBatchProgressMessage): void {
  figma.ui.postMessage(message);
}

function postBatchResult(message: CatalogScaffoldBatchResultMessage): void {
  figma.ui.postMessage(message);
}

export async function handleCatalogDiscover(message: CatalogDiscoverMessage): Promise<void> {
  const normalized = normalizeRepoUrl(message.repoUrl);
  const tokenRecord = await getToken(normalized);
  if (tokenRecord === null) {
    postDiscoverResult({
      type: CATALOG_DISCOVER_RESULT,
      requestId: message.requestId,
      ok: false,
      error: 'Connect GitHub in Settings to browse repo components.',
    });
    return;
  }

  if (message.forceRefresh === true) {
    clearCatalogDiscoveryCache(normalized);
  }

  try {
    const config = await resolveDiscoveryConfig(normalized, {
      specsPath: message.specsPath,
      designSystemBranch: message.designSystemBranch,
    });
    const discovery = await discoverCatalogEntries(normalized, tokenRecord.accessToken, config, {
      forceRefresh: message.forceRefresh,
    });
    postDiscoverResult({
      type: CATALOG_DISCOVER_RESULT,
      requestId: message.requestId,
      ok: true,
      entries: discovery.entries,
      truncated: discovery.truncated,
    });
    pluginLog('[main] catalog/discover ok', String(discovery.entries.length));
  } catch (error) {
    postDiscoverResult({
      type: CATALOG_DISCOVER_RESULT,
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
    });
    pluginLog('[main] catalog/discover failed', extractErrorMessage(error));
  }
}

export async function handleCatalogScaffoldBatch(
  message: CatalogScaffoldBatchMessage,
): Promise<void> {
  const normalized = normalizeRepoUrl(message.repoUrl);
  const tokenRecord = await getToken(normalized);
  const continueOnError =
    message.options === undefined || message.options.continueOnError !== false;

  let accumulatedRegistry = getRegistryFromSnapshot();
  let completed = 0;
  let failed = 0;
  const errors: { specPath: string; message: string }[] = [];

  function finishBatch(ok: boolean): void {
    figma.commitUndo();
    postBatchResult({
      type: CATALOG_SCAFFOLD_BATCH_RESULT,
      requestId: message.requestId,
      ok: ok,
      completed: completed,
      failed: failed,
      registry: accumulatedRegistry,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  if (tokenRecord === null) {
    errors.push({ specPath: '', message: 'Connect GitHub in Settings before batch scaffold.' });
    finishBatch(false);
    return;
  }

  if (message.specPaths.length > MAX_BATCH_SIZE) {
    errors.push({
      specPath: '',
      message: 'Batch limited to ' + String(MAX_BATCH_SIZE) + ' components per run.',
    });
    finishBatch(false);
    return;
  }

  const config = await resolveDiscoveryConfig(normalized);
  const total = message.specPaths.length;

  for (let i = 0; i < message.specPaths.length; i++) {
    const specPath = message.specPaths[i];
    postBatchProgress({
      type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
      requestId: message.requestId,
      index: i,
      total: total,
      specPath: specPath,
      status: 'running',
      displayName: specPath.split('/').pop(),
    });

    const loaded = await loadComponentSpecFromRepo(
      normalized,
      tokenRecord.accessToken,
      specPath,
      config.designSystemBranch,
    );

    if (!isComponentSpecDocument(loaded)) {
      failed += 1;
      const loadMessage = loaded.message;
      errors.push({ specPath: specPath, message: loadMessage });
      postBatchProgress({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: message.requestId,
        index: i,
        total: total,
        specPath: specPath,
        status: 'error',
        error: loadMessage,
      });
      if (!continueOnError) {
        break;
      }
      continue;
    }

    try {
      const outcome = (await runScaffoldComponent(loaded.payload, {
        registry: accumulatedRegistry,
        skipUsageFrame: message.options !== undefined ? message.options.skipUsageFrame : undefined,
        suppressUiMessages: true,
      })) as ScaffoldRunOutcome | undefined;

      if (outcome !== undefined && outcome.ok === false) {
        failed += 1;
        const scaffoldMessage = outcome.error !== undefined ? outcome.error : 'Scaffold failed.';
        errors.push({ specPath: specPath, message: scaffoldMessage });
        postBatchProgress({
          type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
          requestId: message.requestId,
          index: i,
          total: total,
          specPath: specPath,
          status: 'error',
          error: scaffoldMessage,
        });
        if (!continueOnError) {
          break;
        }
        continue;
      }

      accumulatedRegistry = getRegistryFromSnapshot();
      completed += 1;
      postBatchProgress({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: message.requestId,
        index: i,
        total: total,
        specPath: specPath,
        status: 'done',
        componentSetName: loaded.payload.name,
        displayName: loaded.payload.name,
      });
    } catch (error) {
      failed += 1;
      const scaffoldMessage = extractErrorMessage(error);
      errors.push({ specPath: specPath, message: scaffoldMessage });
      postBatchProgress({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: message.requestId,
        index: i,
        total: total,
        specPath: specPath,
        status: 'error',
        error: scaffoldMessage,
      });
      if (!continueOnError) {
        break;
      }
    }
  }

  finishBatch(failed === 0);
  pluginLog(
    '[main] catalog/scaffold-batch done',
    String(completed) + ' ok',
    String(failed) + ' failed',
  );
}
