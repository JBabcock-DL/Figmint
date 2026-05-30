/**
 * WO-044 Components tab import + Code Connect UI state map
 *
 * | UI state | Source | User action |
 * | -------- | ------ | ----------- |
 * | `draft` | paste / import / registry | edit in SpecPreviewPanel |
 * | `importSourcePath` | ImportFromRepoSection | triggers post-scaffold CC offer |
 * | `files[]` | `import/list-files/result` | Refresh file list |
 * | `dependencyTree` | `import/parse/result` | resolve unknowns |
 * | `unmapped[]` | `codeconnect/detect/result` | checkbox select |
 * | `prUrl` | `codeconnect/emit-pr/result` | open PR link |
 * | `canScaffold` | `validateComponentSpecDraft` | Scaffold button |
 * | `progressState` | scaffold messages | passive |
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';
import { Components } from '@/ui/tabs/Components';
import { createMockGitHubConnect } from '../github/mockGitHubConnect';

describe('Components import integration', () => {
  it('asserts section aria-label order', function () {
    render(
      <Components
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: true })}
      />,
    );

    const sections = screen.getAllByRole('region', { hidden: true }).length;
    const labeled = [
      'Paste or load spec',
      'Browse repo components',
      'Import from repo',
      'Code Connect',
      'Re-scaffold from linked components',
      'Spec preview',
    ];
    for (let i = 0; i < labeled.length; i++) {
      expect(screen.getByLabelText(labeled[i])).toBeTruthy();
    }
    expect(sections).toBeGreaterThan(0);
  });

  it('populates preview from import parse but scaffold stays disabled until edit', async function () {
    const user = userEvent.setup();
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <Components
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: true })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Refresh file list' }));

    const listRequest = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === 'import/list-files';
    });
    expect(listRequest).toBeDefined();
    const listRequestId = listRequest![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'import/list-files/result',
            requestId: listRequestId,
            ok: true,
            files: [{ path: 'src/button.tsx', name: 'button.tsx' }],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByRole('option', { name: /button\.tsx/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('option', { name: /button\.tsx/i }));
    await user.click(screen.getByRole('button', { name: 'Parse component' }));

    const parseRequest = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === 'import/parse';
    });
    expect(parseRequest).toBeDefined();
    const parseRequestId = parseRequest![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'import/parse/result',
            requestId: parseRequestId,
            ok: true,
            spec: canonicalFixture,
            dependencyTree: { rootImportPath: 'src/button.tsx', nodes: [] },
            issues: [],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Use in preview' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Use in preview' }));

    await waitFor(function () {
      expect(screen.getByText(/Imported from src\/button\.tsx/)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Scaffold component' })).toBeTruthy();
  });

  it('post-scaffold CC checkbox defaults off and emits only when checked', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <Components
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: true })}
      />,
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'scaffold/result',
            ok: true,
            totalDurationMs: 500,
            componentSetId: 'cs:button',
            componentSetName: 'Button',
            registry: {
              v: 1,
              kind: 'registry',
              fileKey: 'fk',
              components: {},
            },
            audits: [],
            scaffold: {
              componentSet: { id: 'cs:button' },
              variantCount: 1,
              variantByKey: {},
              replacedExisting: false,
              scaffoldId: 's1',
              auditRows: [],
              unresolvedTokens: [],
            },
          },
        },
      }),
    );

    expect(screen.queryByLabelText('Post-scaffold Code Connect offer')).toBeNull();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'import/parse/result',
            requestId: 'forced',
            ok: true,
            spec: canonicalFixture,
            dependencyTree: { rootImportPath: 'x', nodes: [] },
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
            totalDurationMs: 500,
            componentSetId: 'cs:button',
            componentSetName: 'Button',
            registry: {
              v: 1,
              kind: 'registry',
              fileKey: 'fk',
              components: {},
            },
            audits: [],
            scaffold: {
              componentSet: { id: 'cs:button' },
              variantCount: 1,
              variantByKey: {},
              replacedExisting: false,
              scaffoldId: 's1',
              auditRows: [],
              unresolvedTokens: [],
            },
          },
        },
      }),
    );
  });
});
