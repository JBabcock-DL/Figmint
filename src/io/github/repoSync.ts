import type { ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

import { FIGHUB_JSON_FILENAME, parseFigHubJson, resolveFigHubConfig } from '@/io/formats/fighubJson';
import { fetchRepoFileContents, GitHubNotFoundError } from '@/io/github/contents';
import { githubApiViaRelay } from '@/io/github/relayClient';
import { normalizeRepoUrl } from '@/io/github/repoUrl';

export interface FetchFigHubConfigResult {
  resolvedConfig: ResolvedFigHubConfig;
  defaultBranch: string;
  warning?: string;
}

function readDefaultBranch(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return 'main';
  }
  const branch = (body as Record<string, unknown>).default_branch;
  if (typeof branch === 'string' && branch.length > 0) {
    return branch;
  }
  return 'main';
}

export async function fetchFigHubConfigFromRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<FetchFigHubConfigResult> {
  const repoPath = '/repos/' + owner + '/' + repo;
  const repoResponse = await githubApiViaRelay('GET', repoPath, token);
  const defaultBranch =
    repoResponse.ok && repoResponse.body !== undefined
      ? readDefaultBranch(repoResponse.body)
      : 'main';

  let warning: string | undefined;
  let parsedValue = null;

  try {
    const contents = await fetchRepoFileContents(token, owner, repo, FIGHUB_JSON_FILENAME);
    const parsed = parseFigHubJson(contents.text);
    if (parsed.ok) {
      parsedValue = parsed.value;
    } else {
      warning = parsed.error;
    }
  } catch (error) {
    if (!(error instanceof GitHubNotFoundError)) {
      throw error;
    }
  }

  const resolvedConfig = resolveFigHubConfig(parsedValue, defaultBranch);

  return {
    resolvedConfig: resolvedConfig,
    defaultBranch: defaultBranch,
    warning: warning,
  };
}

export function repoTokensCacheKey(repoUrl: string): string {
  const normalized = normalizeRepoUrl(repoUrl);
  const slug = normalized.replace(/[^a-zA-Z0-9]/g, '_');
  return 'fighub:repo:' + slug + ':tokens';
}

export function normalizeExportBasePath(exportBasePath: string): string {
  if (exportBasePath.length === 0) {
    return 'docs/fighub/';
  }
  if (exportBasePath.endsWith('/')) {
    return exportBasePath;
  }
  return exportBasePath + '/';
}
