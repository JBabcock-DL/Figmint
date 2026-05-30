import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CATALOG_DISCOVER } from '@/io/messages/catalog';
import { CatalogPanel } from '@/ui/components/catalog/CatalogPanel';
import { resetCatalogMessageStateForTests } from '@/ui/components/catalog/catalogMessageListener';

describe('CatalogPanel', () => {
  afterEach(function () {
    resetCatalogMessageStateForTests();
  });

  it('shows connect prompt when GitHub is not connected', function () {
    render(
      <CatalogPanel repoUrl="https://github.com/acme/widgets" githubConnected={false} />,
    );
    expect(screen.getByText(/Connect GitHub in Settings/i)).toBeInTheDocument();
  });

  it('shows empty state after discover returns no entries', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <CatalogPanel repoUrl="https://github.com/acme/widgets" githubConnected={true} />,
    );

    const discoverCall = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === CATALOG_DISCOVER;
    });
    expect(discoverCall).toBeDefined();
    const requestId = discoverCall![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'catalog/discover-result',
            requestId: requestId,
            ok: true,
            entries: [],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByText(/No component-spec JSON on GitHub/i)).toBeInTheDocument();
      expect(screen.getByText(/all frameworks/i)).toBeInTheDocument();
    });
  });

  it('renders checklist, select all, and batch trigger', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <CatalogPanel repoUrl="https://github.com/acme/widgets" githubConnected={true} />,
    );

    const discoverCall = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === CATALOG_DISCOVER;
    });
    const requestId = discoverCall![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'catalog/discover-result',
            requestId: requestId,
            ok: true,
            entries: [
              {
                key: 'button',
                path: 'design/components/button.component-spec.v1.json',
                displayName: 'button',
                kind: 'component-spec',
              },
              {
                key: 'input',
                path: 'design/components/input.component-spec.v1.json',
                displayName: 'input',
                kind: 'component-spec',
              },
            ],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByLabelText('Filter components')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Select all components'));
    expect(screen.getByRole('button', { name: 'Scaffold selected (2)' })).toBeInTheDocument();
  });

  it('shows batch error list when result includes failures', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <CatalogPanel repoUrl="https://github.com/acme/widgets" githubConnected={true} />,
    );

    const discoverCall = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === CATALOG_DISCOVER;
    });
    const discoverRequestId = discoverCall![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'catalog/discover-result',
            requestId: discoverRequestId,
            ok: true,
            entries: [
              {
                key: 'button',
                path: 'design/components/button.component-spec.v1.json',
                displayName: 'button',
                kind: 'component-spec',
              },
            ],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByLabelText('Select button')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Select button'));
    await userEvent.click(screen.getByRole('button', { name: 'Scaffold selected (1)' }));

    const batchCall = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === 'catalog/scaffold-batch';
    });
    const batchRequestId = batchCall![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'catalog/scaffold-batch/result',
            requestId: batchRequestId,
            ok: false,
            completed: 0,
            failed: 1,
            registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
            errors: [{ specPath: 'bad.json', message: 'Not a component-spec document.' }],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByText(/Not a component-spec document/i)).toBeInTheDocument();
    });
  });

  it('exposes accessibility labels for search, select all, and progress', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    render(
      <CatalogPanel repoUrl="https://github.com/acme/widgets" githubConnected={true} />,
    );

    const discoverCall = postMessage.mock.calls.find(function (call) {
      return call[0].pluginMessage.type === CATALOG_DISCOVER;
    });
    const requestId = discoverCall![0].pluginMessage.requestId as string;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'catalog/discover-result',
            requestId: requestId,
            ok: true,
            entries: [
              {
                key: 'button',
                path: 'design/components/button.component-spec.v1.json',
                displayName: 'button',
                kind: 'component-spec',
              },
            ],
          },
        },
      }),
    );

    await waitFor(function () {
      expect(screen.getByLabelText('Filter components')).toBeInTheDocument();
      expect(screen.getByLabelText('Select all components')).toBeInTheDocument();
      expect(screen.getByLabelText('Select button')).toBeInTheDocument();
    });
  });
});
