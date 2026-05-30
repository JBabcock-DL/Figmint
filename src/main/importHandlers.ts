import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { collectRegistryKeys } from '@/core/import/shared/collectRegistryKeys';
import { shouldIncludeImportSourcePath } from '@/core/import/shared/importSourceExtensions';
import { buildTokenResolverClassMap } from '@/core/import/shared/tokenResolver';
import { pluginLog } from '@/core/pluginLog';
import { getRegistryFromSnapshot } from '@/core/sync/snapshotStore';
import { fetchRepoFileContents, GitHubNotFoundError } from '@/io/github/contents';
import { validateGitHubRepoUrl } from '@/io/github/githubUiBridge';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import { loadTokenResolverOverride } from '@/io/github/tokenResolverStorage';
import type {
  ImportListFilesMessage,
  ImportListFilesResultMessage,
  ImportParseExecResultMessage,
  ImportParseMessage,
  ImportParseResultMessage,
} from '@/io/messages/import';
import {
  IMPORT_LIST_FILES_RESULT,
  IMPORT_PARSE_EXEC,
  IMPORT_PARSE_RESULT,
} from '@/io/messages/import';

const FILE_LIST_CAP = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

import { discoverImportSourceRoot } from '@/io/github/repoPathDiscovery';
import { fetchRecursiveRepoPaths } from '@/io/github/repoTree';
import { getSyncState, getToken } from '@/io/github/storage';

export { fetchRecursiveRepoPaths } from '@/io/github/repoTree';

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

function resolveImportFramework(message: ImportListFilesMessage): ComponentFramework {
  if (message.framework !== undefined) {
    return message.framework;
  }
  return 'react';
}

function normalizeRootPrefix(rootPath: string): string {
  let normalized = rootPath.replace(/\\/g, '/');
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/';
  }
  return normalized;
}

function deriveFigmaMappingPath(sourcePath: string): string {
  const dot = sourcePath.lastIndexOf('.');
  if (dot >= 0) {
    return sourcePath.slice(0, dot) + '.figma.tsx';
  }
  return sourcePath + '.figma.tsx';
}

async function loadRepoRegistry(
  token: string,
  owner: string,
  repo: string,
): Promise<RegistryV1 | null> {
  try {
    const contents = await fetchRepoFileContents(token, owner, repo, '.fighub-registry.json');
    const parsed = JSON.parse(contents.text) as unknown;
    if (!isRecord(parsed) || parsed.kind !== 'registry') {
      return null;
    }
    return parsed as unknown as RegistryV1;
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      return null;
    }
    return null;
  }
}

export async function handleImportListFiles(message: ImportListFilesMessage): Promise<void> {
  const post = function (result: ImportListFilesResultMessage): void {
    figma.ui.postMessage(result);
  };

  try {
    const repoError = validateGitHubRepoUrl(message.repoUrl);
    if (repoError !== null) {
      post({
        type: IMPORT_LIST_FILES_RESULT,
        requestId: message.requestId,
        ok: false,
        files: [],
        error: repoError,
      });
      return;
    }

    const normalized = normalizeRepoUrl(message.repoUrl);
    const token = await getToken(normalized);
    if (token === null) {
      post({
        type: IMPORT_LIST_FILES_RESULT,
        requestId: message.requestId,
        ok: false,
        files: [],
        error: 'GitHub is not connected for this repository.',
      });
      return;
    }

    const syncState = await getSyncState(normalized);
    const specsPath =
      syncState !== null &&
      syncState.resolvedConfig !== null &&
      syncState.resolvedConfig.specsPath.length > 0
        ? syncState.resolvedConfig.specsPath
        : undefined;
    const ownerRepo = parseOwnerRepo(normalized);
    const ref =
      syncState !== null && syncState.defaultBranch.length > 0
        ? syncState.defaultBranch
        : 'main';

    const allPaths = await fetchRecursiveRepoPaths(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
      ref,
    );

    const framework = resolveImportFramework(message);
    const suggestedRoot = discoverImportSourceRoot(allPaths, framework, specsPath);
    const rootPath = normalizeRootPrefix(
      message.rootPath !== undefined && message.rootPath.length > 0
        ? message.rootPath
        : suggestedRoot,
    );

    const matched: { path: string; name: string }[] = [];
    for (let i = 0; i < allPaths.length; i++) {
      const path = allPaths[i];
      if (!path.startsWith(rootPath)) {
        continue;
      }
      if (!shouldIncludeImportSourcePath(path, framework)) {
        continue;
      }
      matched.push({ path: path, name: basename(path) });
    }

    matched.sort(function (a, b) {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    const truncated = matched.length > FILE_LIST_CAP;
    const files = truncated ? matched.slice(0, FILE_LIST_CAP) : matched;

    post({
      type: IMPORT_LIST_FILES_RESULT,
      requestId: message.requestId,
      ok: true,
      files: files,
      truncated: truncated,
      suggestedRoot: suggestedRoot,
    });
    pluginLog('[main] import/list-files', { count: files.length, truncated: truncated });
  } catch (error) {
    post({
      type: IMPORT_LIST_FILES_RESULT,
      requestId: message.requestId,
      ok: false,
      files: [],
      error: extractErrorMessage(error),
    });
  }
}

export async function handleImportParse(message: ImportParseMessage): Promise<void> {
  const post = function (result: ImportParseResultMessage): void {
    figma.ui.postMessage(result);
  };

  try {
    const repoError = validateGitHubRepoUrl(message.repoUrl);
    if (repoError !== null) {
      post({
        type: IMPORT_PARSE_RESULT,
        requestId: message.requestId,
        ok: false,
        error: repoError,
      });
      return;
    }

    const normalized = normalizeRepoUrl(message.repoUrl);
    const token = await getToken(normalized);
    if (token === null) {
      post({
        type: IMPORT_PARSE_RESULT,
        requestId: message.requestId,
        ok: false,
        error: 'GitHub is not connected for this repository.',
      });
      return;
    }

    const ownerRepo = parseOwnerRepo(normalized);
    const sourceContents = await fetchRepoFileContents(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
      message.sourcePath,
    );

    let mappingText: string | undefined;
    const mappingPath =
      message.figmaMappingPath !== undefined && message.figmaMappingPath.length > 0
        ? message.figmaMappingPath
        : deriveFigmaMappingPath(message.sourcePath);
    try {
      const mappingContents = await fetchRepoFileContents(
        token.accessToken,
        ownerRepo.owner,
        ownerRepo.repo,
        mappingPath,
      );
      mappingText = mappingContents.text;
    } catch (mappingError) {
      if (!(mappingError instanceof GitHubNotFoundError)) {
        pluginLog('[main] import/parse mapping optional fail', extractErrorMessage(mappingError));
      }
    }

    const canvasRegistry = getRegistryFromSnapshot();
    const repoRegistry = await loadRepoRegistry(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
    );
    const registryKeys = collectRegistryKeys(canvasRegistry, repoRegistry);

    const fetchText = async function (path: string): Promise<{ text: string; sha?: string } | null> {
      try {
        const file = await fetchRepoFileContents(
          token.accessToken,
          ownerRepo.owner,
          ownerRepo.repo,
          path,
        );
        return { text: file.text, sha: file.sha };
      } catch {
        return null;
      }
    };

    const syncState = await getSyncState(normalized);
    const ref =
      syncState !== null && syncState.defaultBranch.length > 0
        ? syncState.defaultBranch
        : 'main';
    const repoPaths = await fetchRecursiveRepoPaths(
      token.accessToken,
      ownerRepo.owner,
      ownerRepo.repo,
      ref,
    );

    const tokenResolverOverride = await loadTokenResolverOverride(normalized);
    const manualMap =
      tokenResolverOverride !== null ? tokenResolverOverride.manualMap : undefined;

    const classToVariable = await buildTokenResolverClassMap({
      repoUrl: normalized,
      manualMap: manualMap,
      fetchText: fetchText,
      repoPaths: repoPaths,
    });

    figma.ui.postMessage({
      type: IMPORT_PARSE_EXEC,
      requestId: message.requestId,
      sourcePath: message.sourcePath,
      sourceText: sourceContents.text,
      figmaMappingText: mappingText,
      registryKeys: registryKeys,
      classToVariable: classToVariable,
      manualMap: manualMap,
    });
    pluginLog('[main] import/parse exec dispatched', { path: message.sourcePath });
  } catch (error) {
    post({
      type: IMPORT_PARSE_RESULT,
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
    });
  }
}

/** UI thread ran TypeScript parse — forward result to import UI listeners. */
export function handleImportParseExecResult(message: ImportParseExecResultMessage): void {
  const result: ImportParseResultMessage = {
    type: IMPORT_PARSE_RESULT,
    requestId: message.requestId,
    ok: message.ok,
    spec: message.spec,
    dependencyTree: message.dependencyTree,
    issues: message.issues,
    error: message.error,
  };
  figma.ui.postMessage(result);
  if (message.ok && message.spec !== undefined) {
    pluginLog('[main] import/parse', { name: message.spec.name });
  }
}
