import { githubApiViaRelay } from '@/io/github/relayClient';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

/** Returns repo-relative blob paths from the Git tree (recursive). */
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
