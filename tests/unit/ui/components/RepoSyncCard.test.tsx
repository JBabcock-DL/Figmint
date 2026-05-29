import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RepoSyncCard } from '@/ui/components/RepoSyncCard';

describe('RepoSyncCard', () => {
  it('renders Fetch, Push, and Pull actions without path inputs', function () {
    render(
      <RepoSyncCard
        repoUrl="https://github.com/acme/widgets"
        connected={true}
        sync={{
          fetching: false,
          pulling: false,
          pushing: false,
          lastFetchedAt: null,
          lastPulledAt: null,
          lastPushedAt: null,
          resolvedConfig: {
            tokensPath: 'design/tokens.json',
            specsPath: 'components/',
            exportBasePath: 'docs/fighub/',
            designSystemBranch: 'main',
          },
          configWarning: null,
          pushPrUrl: null,
          error: null,
          fetchRepo: async function () {},
          pullDesignSystem: async function () {},
          pushUpdates: async function () {},
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Fetch latest/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Push committed changes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review pulls from repo/i })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
