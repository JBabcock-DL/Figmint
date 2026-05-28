import { describe, expect, it, vi } from 'vitest';

import {
  SPEC_RESOLUTION_PATHS,
  resolveComponentSpecFromRepo,
} from '@/ui/components/scaffold/resolveComponentSpec';

import * as githubSources from '@/io/sources/github';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

describe('resolveComponentSpecFromRepo', () => {
  it('tries design/components path before legacy path', async () => {
    const loadSpy = vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'unsupported-type',
      message: 'Not Found',
      location: { source: 'paste' },
    });

    const result = await resolveComponentSpecFromRepo('https://github.com/acme/design-system', 'Button');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.triedPaths[0]).toBe(SPEC_RESOLUTION_PATHS[0]('Button'));
      expect(result.triedPaths[1]).toBe(SPEC_RESOLUTION_PATHS[1]('Button'));
    }
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it('returns spec on first successful path', async () => {
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

    const result = await resolveComponentSpecFromRepo('https://github.com/acme/design-system', 'Button');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec.name).toBe('Button');
      expect(result.path).toContain('design/components/');
    }
  });
});
