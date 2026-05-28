import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer, type Dispatch } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DriftPanel } from '@/ui/components/DriftPanel';
import {
  createInitialResolutionState,
  reduceResolution,
  type ResolutionReducerAction,
} from '@/ui/drift/resolutionReducer';

import resolutionAc from '../../../fixtures/drift/drift-report-resolution-ac.v1.json';
import type { DriftReportV1 } from '@detroitlabs/figmint-contracts';

const acReport = resolutionAc as DriftReportV1;

interface HarnessProps {
  onBulkPush?: () => void;
  onBulkPull?: () => void;
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
    <DriftPanel
      state={state}
      dispatch={dispatch as Dispatch<ResolutionReducerAction>}
      onDetect={vi.fn()}
      onBulkPush={props.onBulkPush}
      onBulkPull={props.onBulkPull}
    />
  );
}

function selectDrift(user: ReturnType<typeof userEvent.setup>, driftId: string) {
  const checkbox = screen.getByRole('checkbox', { name: new RegExp(driftId) });
  return user.click(checkbox);
}

describe('resolution flow integration', () => {
  it('shows 10-drift AC summary and disables bulk until conflicts resolve', async () => {
    const user = userEvent.setup();
    render(<ResolutionHarness />);

    expect(screen.getByRole('status')).toHaveTextContent('4↑ 3↓ 3⚠');

    const pushButton = screen.getByRole('button', { name: 'Push selected → PR' });
    const pullButton = screen.getByRole('button', { name: 'Pull selected → apply' });
    expect(pushButton).toBeDisabled();
    expect(pullButton).toBeDisabled();

    await selectDrift(user, 'var/Layout/spacing-4');
    await selectDrift(user, 'var/Layout/spacing-8');
    await selectDrift(user, 'var/Theme/radius-md');
    await selectDrift(user, 'cmp/button');
    expect(pushButton).toBeEnabled();
    expect(pullButton).toBeDisabled();

    await selectDrift(user, 'var/Effects/shadow/md');
    expect(pushButton).toBeDisabled();
    expect(pullButton).toBeDisabled();
  });

  it('enables bulk push after resolving conflicts and fires handler', async () => {
    const user = userEvent.setup();
    const onBulkPush = vi.fn();
    render(<ResolutionHarness onBulkPush={onBulkPush} />);

    await selectDrift(user, 'var/Layout/spacing-4');
    await selectDrift(user, 'var/Effects/shadow/md');

    const pushButton = screen.getByRole('button', { name: 'Push selected → PR' });
    expect(pushButton).toBeDisabled();

    const conflictRow = screen.getByText('var/Effects/shadow/md').closest('li');
    expect(conflictRow).not.toBeNull();
    await user.click(within(conflictRow as HTMLElement).getByRole('button', { name: 'Push' }));
    expect(pushButton).toBeEnabled();

    await user.click(pushButton);
    expect(onBulkPush).toHaveBeenCalledTimes(1);
  });

  it('enables bulk pull for pull-only selection', async () => {
    const user = userEvent.setup();
    const onBulkPull = vi.fn();
    render(<ResolutionHarness onBulkPull={onBulkPull} />);

    await selectDrift(user, 'var/Theme/color/background');
    await selectDrift(user, 'var/Typography/body/size');
    await selectDrift(user, 'cmp/chip');

    const pullButton = screen.getByRole('button', { name: 'Pull selected → apply' });
    expect(pullButton).toBeEnabled();

    await user.click(pullButton);
    expect(onBulkPull).toHaveBeenCalledTimes(1);
  });
});
