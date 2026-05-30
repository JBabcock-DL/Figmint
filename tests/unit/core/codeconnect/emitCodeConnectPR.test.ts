import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitCodeConnectPR } from '@/core/codeconnect/emitCodeConnectPR';
import { mockButtonComponentRef } from '../../../mocks/codeconnectFigma';
import * as githubPR from '@/io/sinks/githubPR';

describe('emitCodeConnectPR', () => {
  beforeEach(function () {
    vi.spyOn(githubPR, 'isGithubPREnabled').mockReturnValue(true);
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('calls executeGithubPRSink once with generated stub files', async function () {
    const sinkMock = vi.spyOn(githubPR, 'executeGithubPRSink').mockResolvedValue({
      ok: true,
      sink: 'github-pr',
      message: 'Opened PR #7',
      artifacts: [{ format: 'json', byteLength: 0, destination: 'https://github.com/acme/widgets/pull/7' }],
    });

    const result = await emitCodeConnectPR({
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'design/components',
      figmaFileKey: 'abc123',
      figmaFileName: 'Design System',
      defaultBranch: 'main',
      owner: 'acme',
      repo: 'widgets',
      framework: 'react',
      components: [mockButtonComponentRef()],
    });

    expect(result.stubs).toHaveLength(1);
    expect(result.truncated).toBe(false);
    expect(sinkMock).toHaveBeenCalledTimes(1);

    const ctx = sinkMock.mock.calls[0][0];
    expect(ctx.files).toHaveLength(1);
    expect(ctx.files[0].path).toBe('design/components/button/Button.figma.tsx');
    expect(ctx.files[0].content).toContain('figma.connect(');
    expect(ctx.contractKind).toBe('code-connect-stubs');
    expect(ctx.options.branchPattern).toBe('fighub/code-connect-stubs-{date}');
    expect(ctx.prBodyOverride).toContain('FigHub Code Connect stubs');
  });

  it('returns unavailable when github PR sink disabled', async function () {
    vi.spyOn(githubPR, 'isGithubPREnabled').mockReturnValue(false);

    const result = await emitCodeConnectPR({
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'design/components',
      figmaFileKey: 'abc123',
      figmaFileName: 'Design System',
      defaultBranch: 'main',
      owner: 'acme',
      repo: 'widgets',
      framework: 'react',
      components: [mockButtonComponentRef()],
    });

    expect(result.sink.ok).toBe(false);
    expect(result.sink.code).toBe('unavailable');
    expect(result.stubs).toHaveLength(0);
  });
});
