import { beforeEach, describe, expect, it } from 'vitest';

import {
  configStorageKey,
  isValidRepoUrl,
  normalizeRepoUrl,
  parseOwnerRepo,
  tokenStorageKey,
} from '@/io/github/repoUrl';

describe('repoUrl', () => {
  it('normalizes valid GitHub repo URLs', () => {
    expect(normalizeRepoUrl('https://github.com/Owner/Repo/')).toBe(
      'https://github.com/Owner/Repo',
    );
    expect(normalizeRepoUrl('  HTTPS://GitHub.COM/acme/widgets  ')).toBe(
      'https://github.com/acme/widgets',
    );
    expect(normalizeRepoUrl('https://github.com/foo/bar')).toBe('https://github.com/foo/bar');
    expect(normalizeRepoUrl('https://github.com/my-org/my.repo')).toBe(
      'https://github.com/my-org/my.repo',
    );
    expect(normalizeRepoUrl('https://github.com/a/b')).toBe('https://github.com/a/b');
  });

  it('rejects invalid GitHub repo URLs', () => {
    expect(function () {
      normalizeRepoUrl('https://github.enterprise.com/acme/repo');
    }).toThrow(/github.com/);
    expect(function () {
      normalizeRepoUrl('https://github.com/acme');
    }).toThrow();
    expect(function () {
      normalizeRepoUrl('http://github.com/acme/repo');
    }).toThrow();
  });

  it('parses owner and repo from normalized URL', () => {
    expect(parseOwnerRepo('https://github.com/acme/widgets')).toEqual({
      owner: 'acme',
      repo: 'widgets',
    });
  });

  it('builds storage keys from normalized repo URL', () => {
    const url = 'https://github.com/acme/widgets';
    expect(tokenStorageKey(url)).toBe('fighub:github:token:https://github.com/acme/widgets');
    expect(configStorageKey(url)).toBe('fighub:github:config:https://github.com/acme/widgets');
  });

  it('validates repo URLs without throwing', () => {
    expect(isValidRepoUrl('https://github.com/acme/widgets')).toBe(true);
    expect(isValidRepoUrl('https://gitlab.com/acme/widgets')).toBe(false);
  });
});

describe('repoUrl storage key stability', () => {
  beforeEach(function () {
    // no-op — placeholder for future shared setup
  });

  it('uses the same normalized key for trailing slash variants', () => {
    const a = tokenStorageKey('https://github.com/acme/widgets/');
    const b = tokenStorageKey('https://github.com/acme/widgets');
    expect(a).toBe(b);
  });
});
