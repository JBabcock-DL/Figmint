const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

/** Strip ?query and #hash without relying on `URL` (unavailable in Figma main sandbox). */
function stripQueryAndHash(value: string): string {
  let end = value.length;
  const hashIndex = value.indexOf('#');
  if (hashIndex !== -1) {
    end = hashIndex;
  }
  const queryIndex = value.indexOf('?');
  if (queryIndex !== -1 && queryIndex < end) {
    end = queryIndex;
  }
  return value.slice(0, end);
}

export function normalizeRepoUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error('Repo URL is required.');
  }

  if (!/^https:\/\//i.test(trimmed)) {
    if (/^http:\/\//i.test(trimmed)) {
      throw new Error('Repo URL must use HTTPS.');
    }
    throw new Error('Invalid repo URL.');
  }

  const withoutScheme = trimmed.replace(/^https:\/\//i, '');
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) {
    throw new Error('Repo URL must be https://github.com/{owner}/{repo}.');
  }

  const hostname = withoutScheme.slice(0, slashIndex).toLowerCase();
  if (hostname !== 'github.com') {
    throw new Error('Only github.com repositories are supported.');
  }

  const pathname = stripQueryAndHash(withoutScheme.slice(slashIndex));
  const pathParts = pathname.split('/').filter(function (part) {
    return part.length > 0;
  });

  if (pathParts.length !== 2) {
    throw new Error('Repo URL must be https://github.com/{owner}/{repo}.');
  }

  const normalized = 'https://github.com/' + pathParts[0] + '/' + pathParts[1];
  if (!GITHUB_REPO_PATTERN.test(normalized)) {
    throw new Error('Invalid GitHub repo URL.');
  }

  return normalized;
}

export function parseOwnerRepo(normalizedUrl: string): { owner: string; repo: string } {
  const url = normalizeRepoUrl(normalizedUrl);
  const parts = url.replace('https://github.com/', '').split('/');
  return { owner: parts[0], repo: parts[1] };
}

export function tokenStorageKey(repoUrl: string): string {
  return 'figmint:github:token:' + normalizeRepoUrl(repoUrl);
}

export function configStorageKey(repoUrl: string): string {
  return 'figmint:github:config:' + normalizeRepoUrl(repoUrl);
}

export function isValidRepoUrl(input: string): boolean {
  try {
    normalizeRepoUrl(input);
    return true;
  } catch {
    return false;
  }
}
