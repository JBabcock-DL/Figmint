import { describe, expect, it, vi } from 'vitest';

import {
  buildSpecFilePath,
  SPEC_RESOLUTION_PATHS,
  resolveComponentSpecFromRepo,
} from '@/ui/components/scaffold/resolveComponentSpec';

import * as githubSources from '@/io/sources/github';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

describe('buildSpecFilePath', () => {
  it('resolves components/Button.json from specsPath', () => {
    expect(buildSpecFilePath('components/', 'Button')).toBe('components/Button.json');
  });
});

describe('resolveComponentSpecFromRepo', () => {
  it('tries config specsPath before legacy paths', async () => {
    const loadSpy = vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'component-spec',
      payload: canonicalFixture,
      sourceMeta: {
        port: 'github',
        repoUrl: 'https://github.com/acme/design-system',
        path: 'components/Button.json',
        receivedAt: '2026-05-28T00:00:00.000Z',
      },
      rawSnippet: '',
    });

    const result = await resolveComponentSpecFromRepo(
      'https://github.com/acme/design-system',
      'Button',
      'components/',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('components/Button.json');
    }
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('tries design/components path before legacy path', async function () {
    const loadSpy = vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'unsupported-type',
      message: 'Not Found',
      location: { source: 'paste' },
    });

    const result = await resolveComponentSpecFromRepo(
      'https://github.com/acme/design-system',
      'Button',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.triedPaths).toContain(SPEC_RESOLUTION_PATHS[0]('Button'));
      expect(result.triedPaths).toContain(SPEC_RESOLUTION_PATHS[0]('button'));
    }
    expect(loadSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('resolves via repo tree when registry key casing differs from filename', async function () {
    const loadSpy = vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'component-spec',
      payload: canonicalFixture,
      sourceMeta: {
        port: 'github',
        repoUrl: 'https://github.com/acme/design-system',
        path: 'design/components/button.component-spec.v1.json',
        receivedAt: '2026-05-28T00:00:00.000Z',
      },
      rawSnippet: '',
    });

    const result = await resolveComponentSpecFromRepo(
      'https://github.com/acme/design-system',
      'Button',
      'components/',
      ['design/components/button.component-spec.v1.json', 'src/ui/components/Button.tsx'],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe('design/components/button.component-spec.v1.json');
    }
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith(
      'https://github.com/acme/design-system',
      'design/components/button.component-spec.v1.json',
    );
  });

  it('returns spec on first successful path', async function () {
    vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'component-spec',
      payload: canonicalFixture,
      sourceMeta: {
        port: 'github',
        repoUrl: 'https://github.com/acme/design-system',
        path: 'design/components/Button.component-spec.v1.json',
        receivedAt: '2026-05-28T00:00:00.000Z',
      },
      rawSnippet: '',
    });

    const result = await resolveComponentSpecFromRepo(
      'https://github.com/acme/design-system',
      'Button',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec.name).toBe('Button');
      expect(result.path).toContain('design/components/');
    }
  });
});
