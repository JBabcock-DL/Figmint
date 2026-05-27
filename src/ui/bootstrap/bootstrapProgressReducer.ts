import type { AuditReportV1 } from '@detroitlabs/figmint-contracts';

import {
  BOOTSTRAP_STEPS,
  type BootstrapProgressMessage,
  type BootstrapResultMessage,
  type BootstrapStepId,
  type BootstrapStepStatus,
} from '@/io/messages/bootstrap';

export interface BootstrapStepState {
  id: BootstrapStepId;
  label: string;
  status: BootstrapStepStatus;
  detail?: string;
  elapsedMs?: number;
  audit?: AuditReportV1;
}

export interface BootstrapProgressState {
  steps: BootstrapStepState[];
  audits: AuditReportV1[];
  running: boolean;
  result: BootstrapResultMessage | null;
  error: string | null;
}

export function createInitialBootstrapProgressState(): BootstrapProgressState {
  return {
    steps: BOOTSTRAP_STEPS.map(function (entry): BootstrapStepState {
      return {
        id: entry.id,
        label: entry.label,
        status: 'pending',
      };
    }),
    audits: [],
    running: false,
    result: null,
    error: null,
  };
}

function upsertAudit(audits: AuditReportV1[], audit: AuditReportV1): AuditReportV1[] {
  const scope = audit.meta.scope;
  const next = audits.slice();
  let replaced = false;
  for (let i = 0; i < next.length; i++) {
    if (next[i].meta.scope === scope) {
      next[i] = audit;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    next.push(audit);
  }
  return next;
}

function updateStep(
  steps: BootstrapStepState[],
  stepId: BootstrapStepId,
  patch: Partial<BootstrapStepState>,
): BootstrapStepState[] {
  return steps.map(function (step) {
    if (step.id !== stepId) {
      return step;
    }
    return Object.assign({}, step, patch);
  });
}

export type BootstrapProgressAction =
  | { type: 'bootstrap/reset' }
  | { type: 'bootstrap/start' }
  | BootstrapProgressMessage
  | BootstrapResultMessage
  | { type: 'bootstrap/error'; message: string };

export function reduceBootstrapProgress(
  state: BootstrapProgressState,
  action: BootstrapProgressAction,
): BootstrapProgressState {
  if (action.type === 'bootstrap/reset') {
    return createInitialBootstrapProgressState();
  }

  if (action.type === 'bootstrap/start') {
    return markBootstrapStarted(createInitialBootstrapProgressState());
  }

  const message = action;
  if (message.type === 'bootstrap/error') {
    return Object.assign({}, state, {
      running: false,
      error: message.message,
    });
  }

  if (message.type === 'bootstrap/result') {
    const audits = message.audits.length > 0 ? message.audits.slice() : state.audits.slice();
    return Object.assign({}, state, {
      running: false,
      result: message,
      audits: audits,
      steps: updateStep(state.steps, 'complete', { status: message.ok ? 'done' : 'error' }),
      error: message.ok ? null : 'Bootstrap finished with errors',
    });
  }

  const progress = action;
  if (progress.type !== 'bootstrap/progress') {
    return state;
  }

  let nextAudits = state.audits;
  if (progress.audit !== undefined) {
    nextAudits = upsertAudit(state.audits, progress.audit);
  }

  const nextSteps = updateStep(state.steps, progress.step, {
    status: progress.status,
    detail: progress.detail,
    elapsedMs: progress.elapsedMs,
    audit: progress.audit,
  });

  return Object.assign({}, state, {
    steps: nextSteps,
    audits: nextAudits,
    running: progress.step !== 'complete' && progress.status === 'running' ? true : state.running,
  });
}

export function markBootstrapStarted(state: BootstrapProgressState): BootstrapProgressState {
  const resetSteps: BootstrapStepState[] = BOOTSTRAP_STEPS.map(
    function (entry): BootstrapStepState {
      return {
        id: entry.id,
        label: entry.label,
        status: 'pending',
      };
    },
  );
  const withAdaptDone = updateStep(resetSteps, 'adapt', { status: 'done' });
  return Object.assign({}, state, {
    steps: withAdaptDone,
    audits: [],
    running: true,
    result: null,
    error: null,
  });
}

export function countCompletedSteps(steps: BootstrapStepState[]): number {
  let count = 0;
  for (const step of steps) {
    const status = step.status;
    if (status === 'done' || status === 'skipped') {
      count += 1;
    }
  }
  return count;
}
