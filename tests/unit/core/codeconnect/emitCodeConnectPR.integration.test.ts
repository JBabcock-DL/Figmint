import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitCodeConnectPR } from '@/core/codeconnect/emitCodeConnectPR';
import { mockButtonComponentRef } from '../../../mocks/codeconnectFigma';
import { mockFiveUnmappedComponentKeys } from '../../../mocks/codeconnectGithubTree';
import * as githubPR from '@/io/sinks/githubPR';

describe('emitCodeConnectPR integration', () => {
  beforeEach(function () {
    vi.spyOn(githubPR, 'isGithubPREnabled').mockReturnValue(true);
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('emits five stubs in one PR for five unmapped components', async function () {
    const sinkMock = vi.spyOn(githubPR, 'executeGithubPRSink').mockResolvedValue({
      ok: true,
      sink: 'github-pr',
      message: 'Opened PR #99',
      artifacts: [{ format: 'json', byteLength: 0, destination: 'https://github.com/acme/widgets/pull/99' }],
    });

    const keys = mockFiveUnmappedComponentKeys();
    const components = keys.map(function (key, index) {
      return mockButtonComponentRef({
        componentKey: key,
        name: 'Component' + String(index + 1),
        nodeId: String(index + 1) + ':1',
      });
    });

    await emitCodeConnectPR({
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'design/components',
      figmaFileKey: 'abc123',
      figmaFileName: 'Design System',
      defaultBranch: 'main',
      owner: 'acme',
      repo: 'widgets',
      framework: 'react',
      components: components,
    });

    expect(sinkMock).toHaveBeenCalledTimes(1);
    const ctx = sinkMock.mock.calls[0][0];
    expect(ctx.files).toHaveLength(5);
    expect(ctx.contractKind).toBe('code-connect-stubs');
    expect(ctx.options.branchPattern).toBe('fighub/code-connect-stubs-{date}');

    for (let i = 0; i < ctx.files.length; i++) {
      expect(ctx.files[i].path.endsWith('.figma.tsx')).toBe(true);
      expect(ctx.files[i].content).toContain('figma.connect(');
      expect(ctx.files[i].content).toContain("@figma/code-connect");
    }
  });
});
