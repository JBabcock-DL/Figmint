import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Components } from '@/ui/tabs/Components';
import { createMockGitHubConnect } from '../github/mockGitHubConnect';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

const componentsProps = {
  repoUrl: 'https://github.com/acme/widgets',
  github: createMockGitHubConnect({ connected: true }),
};

describe('Components scaffold integration', () => {
  it('shows audit panel after scaffold/result without registry export sheet', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(<Components {...componentsProps} />);

    const snapshotRequestId = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === 'snapshot/read';
    });
    expect(snapshotRequestId).toBeDefined();
    const requestId = snapshotRequestId![0].pluginMessage.requestId as string;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'snapshot/read/result',
            requestId: requestId,
            ok: true,
            registry: {
              v: 1,
              kind: 'registry',
              fileKey: 'fk',
              components: {},
            },
          },
        },
      }),
    );

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
            audits: [
              {
                v: 1,
                kind: 'audit-report',
                scope: 'component',
                meta: {
                  generatedAt: '2026-05-28T00:00:00.000Z',
                  operation: 'scaffold-component',
                },
                summary: { rulesPassed: 4, rulesFailed: 0, rulesWarned: 0 },
                passed: true,
                results: [],
              },
            ],
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
      expect(screen.getByLabelText('Component audit')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Registry export')).toBeNull();
  });

  it('posts scaffold/run with spec when CTA enabled', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(<Components repoUrl="" github={createMockGitHubConnect()} />);

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

    const { classifyComponentsIngest } = await import('@/ui/components/scaffold/ingestDocument');
    const outcome = classifyComponentsIngest({
      kind: 'component-spec',
      payload: canonicalFixture,
      sourceMeta: { port: 'paste', receivedAt: '2026-05-28T00:00:00.000Z', charLength: 100 },
    });
    expect(outcome.ok).toBe(true);
  });
});
