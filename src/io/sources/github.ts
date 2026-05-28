import { parseTextToDocument } from './parseText';
import type { GitHubSourceMeta, LoadedDocument, ValidationError } from './types';
import { postContentsFetch, validateGitHubRepoUrl } from '@/io/github/githubUiBridge';

const DEFAULT_TOKENS_PATH = 'design/tokens.json';

export function isSafeRepoPath(path: string): boolean {
  if (path.length === 0) {
    return false;
  }
  const segments = path.split('/');
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '..') {
      return false;
    }
  }
  return true;
}

export async function loadFromGitHub(
  repoUrl: string,
  path: string,
  ref?: string,
): Promise<LoadedDocument<unknown> | ValidationError> {
  const repoError = validateGitHubRepoUrl(repoUrl);
  if (repoError !== null) {
    return {
      kind: 'unsupported-type',
      message: repoError,
      location: { source: 'paste' },
    };
  }

  const normalizedPath = path.length > 0 ? path : DEFAULT_TOKENS_PATH;
  if (!isSafeRepoPath(normalizedPath)) {
    return {
      kind: 'unsupported-type',
      message: 'Invalid path: parent directory segments are not allowed.',
      location: { source: 'paste' },
    };
  }

  let contents: { text: string; sha?: string };
  try {
    contents = await postContentsFetch({
      repoUrl: repoUrl,
      path: normalizedPath,
      ref: ref,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'unsupported-type',
      message: message,
      location: { source: 'paste' },
    };
  }

  return parseTextToDocument(
    contents.text,
    { source: 'paste' },
    function (_kind, _charLength) {
      const meta: GitHubSourceMeta = {
        port: 'github',
        repoUrl: repoUrl,
        path: normalizedPath,
        ref: ref,
        sha: contents.sha,
        receivedAt: new Date().toISOString(),
      };
      return meta;
    },
  );
}
