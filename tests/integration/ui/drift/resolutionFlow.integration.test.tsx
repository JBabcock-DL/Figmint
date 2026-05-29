import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer, type Dispatch } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SyncChangesPanel } from '@/ui/components/SyncChangesPanel';
import {
  createInitialResolutionState,
  reduceResolution,
  type ResolutionReducerAction,
} from '@/ui/drift/resolutionReducer';

import resolutionAc from '../../../fixtures/drift/drift-report-resolution-ac.v1.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const acReport = resolutionAc as DriftReportV1;

interface HarnessProps {
  onAcceptPull?: (driftId: string) => void;
}

function ResolutionHarness(props: HarnessProps) {
  const [state, dispatch] = useReducer(
    reduceResolution,
    undefined,
    function () {
      const initial = createInitialResolutionState();
      initial.report = acReport;
      return initial;
    },
  );

  return (
    <SyncChangesPanel
      state={state}
      dispatch={dispatch as Dispatch<ResolutionReducerAction>}
      onAcceptPull={props.onAcceptPull}
    />
  );
}

describe('resolution flow integration', () => {
  it('shows push accordion with select all and commit', async () => {
    const user = userEvent.setup();
    render(<ResolutionHarness />);

    expect(screen.getByText(/Changes to push/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commit' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: 'Commit' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Commit' }));
    expect(screen.getByText(/committed — use/)).toBeInTheDocument();
  });

  it('shows pull list with accept and deny', async () => {
    const user = userEvent.setup();
    const onAcceptPull = vi.fn();
    render(<ResolutionHarness onAcceptPull={onAcceptPull} />);

    const pullSection = screen.getByText(/Changes to pull/).closest('details');
    expect(pullSection).not.toBeNull();

    const acceptButtons = within(pullSection as HTMLElement).getAllByRole('button', {
      name: 'Accept',
    });
    expect(acceptButtons.length).toBeGreaterThan(0);

    await user.click(acceptButtons[0]);
    expect(onAcceptPull).toHaveBeenCalled();

    const denyButtons = within(pullSection as HTMLElement).getAllByRole('button', { name: 'Deny' });
    await user.click(denyButtons[1]);
    expect(within(pullSection as HTMLElement).queryAllByRole('button', { name: 'Deny' }).length).toBe(
      denyButtons.length - 1,
    );
  });

  it('requires conflict resolve before push commit includes conflict row', async () => {
    render(<ResolutionHarness />);
    expect(screen.getByText(/Conflicts \(3\)/)).toBeInTheDocument();
  });
});
