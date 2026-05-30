import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileBrowserList } from '@/ui/components/import/FileBrowserList';

describe('FileBrowserList', () => {
  it('filters and selects a file row', async function () {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <FileBrowserList
        files={[
          { path: 'src/button.tsx', name: 'button.tsx' },
          { path: 'src/card.tsx', name: 'card.tsx' },
        ]}
        rootPath="src/"
        selectedPath=""
        onSelect={onSelect}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'card');
    await user.click(screen.getByRole('option', { name: /card\.tsx/i }));
    expect(onSelect).toHaveBeenCalledWith('src/card.tsx');
  });

  it('shows empty state when filter matches nothing', async function () {
    const user = userEvent.setup();
    render(
      <FileBrowserList
        files={[{ path: 'src/button.tsx', name: 'button.tsx' }]}
        rootPath="src/"
        selectedPath=""
        onSelect={function () { return undefined; }}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'missing');
    await waitFor(function () {
      expect(screen.getByText(/No matching files found under src\//)).toBeTruthy();
    });
  });
});
