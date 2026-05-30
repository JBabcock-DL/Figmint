import { fetchRecursiveRepoPaths } from '@/io/github/repoTree';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import { getSyncState, getToken } from '@/io/github/storage';

/** Best-effort full repo path list for discovery heuristics (empty when offline). */
export async function listRepoPathsForRepo(repoUrl: string): Promise<readonly string[]> {
  try {
    const normalized = normalizeRepoUrl(repoUrl);
    const token = await getToken(normalized);
    if (token === null) {
      return [];
    }
    const ownerRepo = parseOwnerRepo(normalized);
    const syncState = await getSyncState(normalized);
    const ref =
      syncState !== null && syncState.defaultBranch.length > 0
        ? syncState.defaultBranch
        : 'main';
    return fetchRecursiveRepoPaths(token.accessToken, ownerRepo.owner, ownerRepo.repo, ref);
  } catch {
    return [];
  }
}
