import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DriftList } from '@/ui/components/DriftList';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const report = driftPayload as DriftReportV1;

describe('DriftList', () => {
  it('filters rows by chip selection', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <DriftList
        drifts={report.drifts}
        filter="all"
        selectedIds={new Set<string>()}
        resolutions={new Map()}
        openConflictId={null}
        onFilterChange={onFilterChange}
        onToggleSelect={vi.fn()}
        onRowAction={vi.fn()}
        onOpenConflict={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Push ↑' }));
    expect(onFilterChange).toHaveBeenCalledWith('push');
  });
});
