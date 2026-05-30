import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '@/ui/tabs/Settings';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';

const REPO = 'https://github.com/acme/widgets';

function installClientStorageMock() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).figma = {
    clientStorage: {
      getAsync: async function (key: string) {
        return store.get(key);
      },
      setAsync: async function (key: string, value: string) {
        store.set(key, value);
      },
      deleteAsync: async function (key: string) {
        store.delete(key);
      },
    },
  };
  return store;
}

function githubConnected(): UseGitHubConnectResult {
  return {
    connected: true,
    relayOk: true,
    oauthPhase: 'idle',
    statusMessage: 'Connected',
    tokenPreview: 'gho_…',
    device: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('Settings token resolver', () => {
  beforeEach(function () {
    installClientStorageMock();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ resolvedConfig: null }),
      }),
    );
  });

  it('renders detection label and saves override', async function () {
    render(
      <Settings
        repoUrl={REPO}
        onRepoUrlChange={vi.fn()}
        github={githubConnected()}
      />,
    );

    await waitFor(function () {
      expect(screen.getByText(/Token resolver/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/\{ "bg-primary"/);
    fireEvent.change(textarea, {
      target: { value: '{"bg-primary":"color/primary/default"}' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save override/i }));

    await waitFor(function () {
      expect(screen.getByText(/override saved/i)).toBeInTheDocument();
    });
  });
});
