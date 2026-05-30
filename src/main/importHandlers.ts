import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { collectRegistryKeys } from '@/core/import/shared/collectRegistryKeys';
import { buildTokenResolverClassMap } from '@/core/import/shared/tokenResolver';
import { pluginLog } from '@/core/pluginLog';
import { getRegistryFromSnapshot } from '@/core/sync/snapshotStore';
import { fetchRepoFileContents, GitHubNotFoundError } from '@/io/github/contents';
import { githubApiViaRelay } from '@/io/github/relayClient';
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

const EXCLUDED_SUFFIXES = ['.test.tsx', '.stories.tsx', '.figma.tsx'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

import { deriveComponentsRoot } from '@/core/import/shared/deriveComponentsRoot';
import { getSyncState, getToken } from '@/io/github/storage';

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}
function shouldIncludeTsxPath(path: string): boolean {
  if (!path.endsWith('.tsx')) {
    return false;
  }
  for (let i = 0; i < EXCLUDED_SUFFIXES.length; i++) {
    if (path.endsWith(EXCLUDED_SUFFIXES[i])) {
      return false;
    }
  }
  return true;
}

function normalizeRootPrefix(rootPath: string): string {
  let normalized = rootPath.replace(/\\/g, '/');
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/';
  }
  return normalized;
}

function readDefaultBranch(body: unknown): string {
  if (!isRecord(body)) {
    return 'main';
  }
  const branch = body.default_branch;
  if (typeof branch === 'string' && branch.length > 0) {
    return branch;
  }
  return 'main';
}

function readRefTreeSha(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const object = body.object;
  if (isRecord(object) && typeof object.sha === 'string' && object.sha.length > 0) {
    return object.sha;
  }
  return readTreeSha(body);
}

function readTreeSha(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const commit = body.commit;
  if (!isRecord(commit)) {
    return null;
  }
  const tree = commit.tree;
  if (!isRecord(tree)) {
    return null;
  }
  if (typeof tree.sha === 'string' && tree.sha.length > 0) {
    return tree.sha;
  }
  return null;
}

interface GitHubTreeEntry {
  path?: string;
  type?: string;
}

export async function fetchRecursiveRepoPaths(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<string[]> {
  const repoPath = '/repos/' + owner + '/' + repo;
  const refResponse = await githubApiViaRelay(
    'GET',
    repoPath + '/git/ref/heads/' + encodeURIComponent(ref),
    token,
  );
  let treeSha: string | null = null;
  if (refResponse.ok && refResponse.body !== undefined) {
    treeSha = readRefTreeSha(refResponse.body);
  }

  if (treeSha === null) {
    const repoResponse = await githubApiViaRelay('GET', repoPath, token);
    const defaultBranch =
      repoResponse.ok && repoResponse.body !== undefined
        ? readDefaultBranch(repoResponse.body)
        : ref;
    const branchRef = await githubApiViaRelay(
      'GET',
      repoPath + '/git/ref/heads/' + encodeURIComponent(defaultBranch),
      token,
    );
    if (branchRef.ok && branchRef.body !== undefined) {
      treeSha = readRefTreeSha(branchRef.body);
    }
  }

  if (treeSha === null) {
    throw new Error('Could not resolve Git tree for repository.');
  }

  const treeResponse = await githubApiViaRelay(
    'GET',
    repoPath + '/git/trees/' + treeSha + '?recursive=1',
    token,
  );
  if (!treeResponse.ok || !isRecord(treeResponse.body)) {
    throw new Error('GitHub tree request failed.');
  }

  const treeEntries = treeResponse.body.tree;
  if (!Array.isArray(treeEntries)) {
    return [];
  }

  const paths: string[] = [];
  for (let i = 0; i < treeEntries.length; i++) {
    const entry = treeEntries[i] as GitHubTreeEntry;
    if (entry.type === 'blob' && typeof entry.path === 'string') {
      paths.push(entry.path);
    }
  }
  return paths;
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
    const rootPath = normalizeRootPrefix(
      message.rootPath !== undefined && message.rootPath.length > 0
        ? message.rootPath
        : deriveComponentsRoot(specsPath),
    );

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

    const matched: { path: string; name: string }[] = [];
    for (let i = 0; i < allPaths.length; i++) {
      const path = allPaths[i];
      if (!path.startsWith(rootPath)) {
        continue;
      }
      if (!shouldIncludeTsxPath(path)) {
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
    });
    console.debug('[main] import/list-files', { count: files.length, truncated: truncated });
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

    const tokenResolverOverride = await loadTokenResolverOverride(normalized);
    const manualMap =
      tokenResolverOverride !== null ? tokenResolverOverride.manualMap : undefined;

    const classToVariable = await buildTokenResolverClassMap({
      repoUrl: normalized,
      manualMap: manualMap,
      fetchText: fetchText,
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
    console.debug('[main] import/parse exec dispatched', { path: message.sourcePath });
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
    console.debug('[main] import/parse', { name: message.spec.name });
  }
}
