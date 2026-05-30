import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CodeConnectSection } from '@/ui/components/codeconnect/CodeConnectSection';
import { createMockGitHubConnect } from '../github/mockGitHubConnect';

const sectionBorder = { border: '1px solid #ccc', padding: 12 };
const sectionHeading = { fontSize: 13, fontWeight: 600, margin: '0 0 8px' };

describe('CodeConnectSection', () => {
  it('returns null when GitHub disconnected', function () {
    const { container } = render(
      <CodeConnectSection
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: false })}
        sectionBorder={sectionBorder}
        sectionHeading={sectionHeading}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('scan, select, emit PR link', async function () {
    const user = userEvent.setup();
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <CodeConnectSection
        repoUrl="https://github.com/acme/widgets"
        github={createMockGitHubConnect({ connected: true })}
        sectionBorder={sectionBorder}
        sectionHeading={sectionHeading}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Scan for unmapped' }));
    const detectReq = postMessage.mock.calls.find(function (c) {
      return c[0].pluginMessage.type === 'codeconnect/detect';
    })!;

    const unmapped = [
      { nodeId: '1:1', name: 'A' },
      { nodeId: '2:2', name: 'B' },
      { nodeId: '3:3', name: 'C' },
      { nodeId: '4:4', name: 'D' },
      { nodeId: '5:5', name: 'E' },
    ];

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'codeconnect/detect/result',
            requestId: detectReq[0].pluginMessage.requestId,
            ok: true,
            unmapped: unmapped,
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByLabelText('A')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Emit Code Connect PR' }));

    const emitReq = postMessage.mock.calls.find(function (c) {
      return c[0].pluginMessage.type === 'codeconnect/emit-pr';
    })!;
    expect(emitReq[0].pluginMessage.componentIds).toHaveLength(5);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'codeconnect/emit-pr/result',
            requestId: emitReq[0].pluginMessage.requestId,
            ok: true,
            prUrl: 'https://github.com/o/r/pull/99',
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByText(/PR opened:/)).toBeTruthy();
    });
    const link = screen.getByRole('link', { name: 'https://github.com/o/r/pull/99' });
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
