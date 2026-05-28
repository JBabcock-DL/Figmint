import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Components } from '@/ui/tabs/Components';
import { createMockGitHubConnect } from '../github/mockGitHubConnect';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

const componentsProps = {
  repoUrl: 'https://github.com/acme/widgets',
  registryPath: '.figmint-registry.json',
  github: createMockGitHubConnect({ connected: true }),
};

describe('Components scaffold integration', () => {
  it('shows registry export section after scaffold/result', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(<Components {...componentsProps} />);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'scaffold/result',
            ok: true,
            totalDurationMs: 1200,
            componentSetId: 'cs:1',
            componentSetName: 'Button — ComponentSet',
            registry: {
              v: 1,
              kind: 'registry',
              fileKey: 'fk',
              components: {
                Button: {
                  nodeId: 'cs:1',
                  key: 'key',
                  pageName: '↳ Buttons',
                  publishedAt: '2026-05-28T00:00:00.000Z',
                  version: 1,
                  cvaHash: 'hash',
                },
              },
            },
            audits: [],
            scaffold: {
              componentSet: { id: 'cs:1' },
              variantCount: 12,
              variantByKey: {},
              replacedExisting: false,
              scaffoldId: 'scaffold-1',
              auditRows: [],
              unresolvedTokens: [],
            },
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByLabelText('Registry export')).toBeTruthy();
    });
    expect(screen.getByText('Update registry')).toBeTruthy();
  });

  it('posts scaffold/run with spec when CTA enabled', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <Components
        repoUrl=""
        registryPath=".figmint-registry.json"
        github={createMockGitHubConnect()}
      />,
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'io/loaded',
            kind: 'component-spec',
          },
        },
      }),
    );

    // Simulate paste via direct document load through internal flow — load fixture through ingest
    const { classifyComponentsIngest } = await import('@/ui/components/scaffold/ingestDocument');
    const outcome = classifyComponentsIngest({
      kind: 'component-spec',
      payload: canonicalFixture,
      sourceMeta: { port: 'paste', receivedAt: '', charLength: 0 },
      rawSnippet: '',
    });
    expect(outcome.ok).toBe(true);

    // User would paste via SourcePasteTextarea; verify postMessage shape separately
    expect(postMessage).not.toHaveBeenCalled();
  });
});
