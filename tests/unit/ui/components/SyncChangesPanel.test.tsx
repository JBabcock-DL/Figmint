import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { describe, expect, it } from 'vitest';

import { SyncChangesPanel } from '@/ui/components/SyncChangesPanel';
import { createInitialResolutionState, reduceResolution } from '@/ui/drift/resolutionReducer';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const report = driftPayload as DriftReportV1;

describe('SyncChangesPanel', () => {
  it('clears checkboxes when Clear is clicked', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [state, dispatch] = useReducer(reduceResolution, undefined, function () {
        const initial = createInitialResolutionState();
        initial.report = report;
        return initial;
      });
      return <SyncChangesPanel state={state} dispatch={dispatch} />;
    }

    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: 'Commit' })).toBeDisabled();
  });
});
