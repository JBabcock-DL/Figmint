import {
  extractCatalogKey,
  matchesCatalogPath,
  normalizeSpecsPath,
} from '@/io/github/componentSpecPaths';
import { pluginLog } from '@/core/pluginLog';
import { GitHubFlowError, mapGitHubHttpError } from '@/io/github/githubErrors';
import { listAncestorDirectories } from '@/io/github/repoPathDiscovery';
import { githubApiViaRelay, type GitHubRelayApiResponse } from '@/io/github/relayClient';
import { parseOwnerRepo } from '@/io/github/repoUrl';

export {
  extractCatalogKey,
  findComponentSpecPathInRepo,
  matchesCatalogPath,
  normalizeSpecsPath,
} from '@/io/github/componentSpecPaths';

export interface CatalogEntry {
  key: string;
  path: string;
  displayName: string;
  kind: 'component-spec';
}

export interface CatalogDiscoveryConfig {
  specsPath: string;
  designSystemBranch: string;
}

export interface CatalogDiscoveryResult {
  entries: CatalogEntry[];
  truncated: boolean;
  fetchedAt: number;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
}

const TREE_CACHE_TTL_MS = 5 * 60 * 1000;
const CONTENTS_FALLBACK_MAX_DEPTH = 4;

const treeCache = new Map<string, CatalogDiscoveryResult>();

function readStringField(body: unknown, field: string): string {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub API response.');
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('GitHub API response missing ' + field + '.');
  }
  return value;
}

function readNestedStringField(body: unknown, parentField: string, field: string): string {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub API response.');
  }
  const parent = (body as Record<string, unknown>)[parentField];
  return readStringField(parent, field);
}

function throwMappedHttpError(
  response: GitHubRelayApiResponse,
  context: { branch?: string } = {},
): never {
  throw new GitHubFlowError(
    mapGitHubHttpError(response.status, response.body, context),
    response.status,
  );
}

function assertOk(response: GitHubRelayApiResponse, context: { branch?: string } = {}): void {
  if (!response.ok) {
    throwMappedHttpError(response, context);
  }
}

async function githubGetWithRetry(path: string, token: string): Promise<GitHubRelayApiResponse> {
  let response = await githubApiViaRelay('GET', path, token);
  if (!response.ok && response.status >= 500) {
    response = await githubApiViaRelay('GET', path, token);
  }
  return response;
}

function buildCacheKey(repoUrl: string, branch: string, specsPath: string): string {
  return repoUrl + '|' + branch + '|' + normalizeSpecsPath(specsPath);
}

export function clearCatalogDiscoveryCache(repoUrl?: string): void {
  if (repoUrl === undefined) {
    treeCache.clear();
    return;
  }
  const prefix = repoUrl + '|';
  for (const key of treeCache.keys()) {
    if (key.startsWith(prefix)) {
      treeCache.delete(key);
    }
  }
}

async function resolveBranchTreeSha(
  repoPath: string,
  token: string,
  branch: string,
): Promise<string> {
  const refResponse = await githubGetWithRetry(
    repoPath + '/git/ref/heads/' + encodeURIComponent(branch),
    token,
  );
  if (!refResponse.ok) {
    throw new GitHubFlowError(
      mapGitHubHttpError(refResponse.status, refResponse.body, { branch: branch }),
      refResponse.status,
    );
  }
  const commitSha = readNestedStringField(refResponse.body, 'object', 'sha');
  const commitResponse = await githubGetWithRetry(repoPath + '/git/commits/' + commitSha, token);
  assertOk(commitResponse, { branch: branch });
  return readNestedStringField(commitResponse.body, 'tree', 'sha');
}

function extractFilenameStem(path: string): string {
  const segments = path.split('/');
  const filename = segments[segments.length - 1];
  if (filename.endsWith('.component-spec.v1.json')) {
    return filename.slice(0, -'.component-spec.v1.json'.length);
  }
  if (filename.endsWith('.v1.json')) {
    return filename.slice(0, -'.v1.json'.length);
  }
  if (filename.endsWith('.json')) {
    return filename.slice(0, -'.json'.length);
  }
  return filename;
}

function buildCatalogEntry(path: string): CatalogEntry {
  const stem = extractFilenameStem(path);
  return {
    key: extractCatalogKey(path),
    path: path,
    displayName: stem,
    kind: 'component-spec',
  };
}

export function filterTreePaths(tree: GitHubTreeEntry[], specsPath: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.type !== 'blob') {
      continue;
    }
    if (!matchesCatalogPath(node.path, specsPath)) {
      continue;
    }
    entries.push(buildCatalogEntry(node.path));
  }
  return dedupeCatalogEntries(entries);
}

export function dedupeCatalogEntries(entries: CatalogEntry[]): CatalogEntry[] {
  const byKey = new Map<string, CatalogEntry>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const existing = byKey.get(entry.key);
    if (existing === undefined || entry.path.length < existing.path.length) {
      byKey.set(entry.key, entry);
    }
  }
  const deduped: CatalogEntry[] = [];
  for (const entry of byKey.values()) {
    deduped.push(entry);
  }
  deduped.sort(function (a, b) {
    return a.displayName.localeCompare(b.displayName);
  });
  return deduped;
}

function readTreeEntries(body: unknown): { tree: GitHubTreeEntry[]; truncated: boolean } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub tree response.');
  }
  const record = body as Record<string, unknown>;
  const treeValue = record.tree;
  if (!Array.isArray(treeValue)) {
    throw new Error('GitHub tree response missing tree array.');
  }
  const tree: GitHubTreeEntry[] = [];
  for (let i = 0; i < treeValue.length; i++) {
    const node = treeValue[i];
    if (typeof node !== 'object' || node === null) {
      continue;
    }
    const typed = node as Record<string, unknown>;
    if (typeof typed.path !== 'string' || typeof typed.type !== 'string') {
      continue;
    }
    tree.push({
      path: typed.path,
      mode: typeof typed.mode === 'string' ? typed.mode : '',
      type: typed.type,
      sha: typeof typed.sha === 'string' ? typed.sha : '',
      size: typeof typed.size === 'number' ? typed.size : undefined,
    });
  }
  const truncated = record.truncated === true;
  return { tree: tree, truncated: truncated };
}

interface ContentsListItem {
  path: string;
  type: string;
}

function readContentsList(body: unknown): ContentsListItem[] {
  if (!Array.isArray(body)) {
    if (typeof body === 'object' && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.path === 'string' && typeof record.type === 'string') {
        return [{ path: record.path, type: record.type }];
      }
    }
    return [];
  }
  const items: ContentsListItem[] = [];
  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    if (typeof node !== 'object' || node === null) {
      continue;
    }
    const typed = node as Record<string, unknown>;
    if (typeof typed.path !== 'string' || typeof typed.type !== 'string') {
      continue;
    }
    items.push({ path: typed.path, type: typed.type });
  }
  return items;
}

async function listContentsDirectory(
  repoPath: string,
  token: string,
  path: string,
  branch: string,
): Promise<ContentsListItem[]> {
  let apiPath = repoPath + '/contents/' + path.split('/').join('/');
  apiPath += '?ref=' + encodeURIComponent(branch);
  const response = await githubGetWithRetry(apiPath, token);
  assertOk(response, { branch: branch });
  return readContentsList(response.body);
}

async function walkContentsPaths(
  repoPath: string,
  token: string,
  rootPath: string,
  branch: string,
  depth: number,
  collected: GitHubTreeEntry[],
): Promise<void> {
  if (depth > CONTENTS_FALLBACK_MAX_DEPTH) {
    return;
  }
  const items = await listContentsDirectory(repoPath, token, rootPath, branch);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === 'file') {
      collected.push({
        path: item.path,
        mode: '100644',
        type: 'blob',
        sha: '',
      });
      continue;
    }
    if (item.type === 'dir') {
      await walkContentsPaths(repoPath, token, item.path, branch, depth + 1, collected);
    }
  }
}

async function discoverViaContentsFallback(
  repoPath: string,
  token: string,
  config: CatalogDiscoveryConfig,
): Promise<GitHubTreeEntry[]> {
  const collected: GitHubTreeEntry[] = [];
  const specsRoot = normalizeSpecsPath(config.specsPath).replace(/\/$/, '');
  const walkRoots = listAncestorDirectories(specsRoot);
  for (let i = 0; i < walkRoots.length; i++) {
    await walkContentsPaths(
      repoPath,
      token,
      walkRoots[i],
      config.designSystemBranch,
      0,
      collected,
    );
  }
  return collected;
}

async function fetchRecursiveTree(
  repoPath: string,
  token: string,
  treeSha: string,
): Promise<{ tree: GitHubTreeEntry[]; truncated: boolean }> {
  const response = await githubGetWithRetry(
    repoPath + '/git/trees/' + treeSha + '?recursive=1',
    token,
  );
  assertOk(response);
  return readTreeEntries(response.body);
}

export async function discoverCatalogEntries(
  repoUrl: string,
  token: string,
  config: CatalogDiscoveryConfig,
  options?: { forceRefresh?: boolean },
): Promise<CatalogDiscoveryResult> {
  const cacheKey = buildCacheKey(repoUrl, config.designSystemBranch, config.specsPath);
  if (options === undefined || options.forceRefresh !== true) {
    const cached = treeCache.get(cacheKey);
    if (cached !== undefined && Date.now() - cached.fetchedAt < TREE_CACHE_TTL_MS) {
      return cached;
    }
  }

  const ownerRepo = parseOwnerRepo(repoUrl);
  const repoPath = '/repos/' + ownerRepo.owner + '/' + ownerRepo.repo;
  const treeSha = await resolveBranchTreeSha(
    repoPath,
    token,
    config.designSystemBranch,
  );
  let treeResult = await fetchRecursiveTree(repoPath, token, treeSha);
  let truncated = treeResult.truncated;

  if (treeResult.truncated) {
    pluginLog('[main] catalog/discover tree truncated — falling back to contents walk');
    treeResult = {
      tree: await discoverViaContentsFallback(repoPath, token, config),
      truncated: true,
    };
    truncated = true;
  }

  const result: CatalogDiscoveryResult = {
    entries: filterTreePaths(treeResult.tree, config.specsPath),
    truncated: truncated,
    fetchedAt: Date.now(),
  };
  treeCache.set(cacheKey, result);
  return result;
}
