import { githubApiViaRelay } from '@/io/github/relayClient';

export class GitHubAuthError extends Error {
  readonly name = 'GitHubAuthError';
}

export class GitHubNotFoundError extends Error {
  readonly name = 'GitHubNotFoundError';
}

interface GitHubContentsResponse {
  content?: string;
  sha?: string;
  encoding?: string;
}

function decodeBase64Content(encoded: string): string {
  const normalized = encoded.replace(/\n/g, '');
  return atob(normalized);
}

function buildContentsPath(owner: string, repo: string, path: string, ref?: string): string {
  let apiPath = '/repos/' + owner + '/' + repo + '/contents/' + path.split('/').join('/');
  if (ref !== undefined && ref.length > 0) {
    apiPath += '?ref=' + encodeURIComponent(ref);
  }
  return apiPath;
}

export async function fetchRepoFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ text: string; sha: string }> {
  const response = await githubApiViaRelay(
    'GET',
    buildContentsPath(owner, repo, path, ref),
    token,
  );

  if (response.status === 401) {
    throw new GitHubAuthError('GitHub authentication failed. Reconnect in Settings.');
  }

  if (response.status === 404) {
    throw new GitHubNotFoundError('File not found at path: ' + path);
  }

  if (!response.ok) {
    const message =
      typeof response.body === 'object' &&
      response.body !== null &&
      'message' in (response.body as Record<string, unknown>) &&
      typeof (response.body as Record<string, unknown>).message === 'string'
        ? String((response.body as Record<string, unknown>).message)
        : 'GitHub contents request failed with HTTP ' + String(response.status);
    throw new Error(message);
  }

  const payload = response.body as GitHubContentsResponse;
  if (typeof payload.content !== 'string' || payload.content.length === 0) {
    throw new Error('GitHub contents response missing file content.');
  }

  const sha = typeof payload.sha === 'string' ? payload.sha : '';
  return {
    text: decodeBase64Content(payload.content),
    sha: sha,
  };
}
