import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';
import { ImportFromRepoSection } from '@/ui/components/import/ImportFromRepoSection';
import { createMockGitHubConnect } from '../github/mockGitHubConnect';

const sectionBorder = { border: '1px solid #ccc', padding: 12 };
const sectionHeading = { fontSize: 13, fontWeight: 600, margin: '0 0 8px' };

describe('ImportFromRepoSection', () => {
  it('shows disconnected guard', function () {
    render(
      <ImportFromRepoSection
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: false })}
        onSpecReady={function () { return undefined; }}
        sectionBorder={sectionBorder}
        sectionHeading={sectionHeading}
      />,
    );
    expect(screen.getByText(/Connect GitHub in Settings/)).toBeTruthy();
  });

  it('lists files, parses, and hands off spec', async function () {
    const user = userEvent.setup();
    const onSpecReady = vi.fn();
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <ImportFromRepoSection
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: true })}
        onSpecReady={onSpecReady}
        sectionBorder={sectionBorder}
        sectionHeading={sectionHeading}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Refresh file list' }));
    const listReq = postMessage.mock.calls.find(function (c) {
      return c[0].pluginMessage.type === 'import/list-files';
    })!;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'import/list-files/result',
            requestId: listReq[0].pluginMessage.requestId,
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

    const parseReq = postMessage.mock.calls.find(function (c) {
      return c[0].pluginMessage.type === 'import/parse';
    })!;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'import/parse/result',
            requestId: parseReq[0].pluginMessage.requestId,
            ok: true,
            spec: canonicalFixture,
            dependencyTree: { rootImportPath: 'src/button.tsx', nodes: [] },
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Use in preview' })).toBeTruthy();
    });
    await user.click(screen.getByRole('button', { name: 'Use in preview' }));
    expect(onSpecReady).toHaveBeenCalled();
  });
});
