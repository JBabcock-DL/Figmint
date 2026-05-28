import type { AuditReportV1 } from '@detroitlabs/fighub-contracts';

import {
  SCAFFOLD_STEPS,
  type ScaffoldErrorMessage,
  type ScaffoldProgressMessage,
  type ScaffoldResultMessage,
  type ScaffoldStepId,
  type ScaffoldStepStatus,
} from '@/io/messages/scaffold';

export interface ScaffoldStepState {
  id: ScaffoldStepId;
  label: string;
  status: ScaffoldStepStatus;
  detail?: string;
  elapsedMs?: number;
  audit?: AuditReportV1;
}

export interface ScaffoldProgressState {
  steps: ScaffoldStepState[];
  audits: AuditReportV1[];
  running: boolean;
  result: ScaffoldResultMessage | null;
  error: string | null;
  failedStep: ScaffoldStepId | null;
}

export function createInitialScaffoldProgressState(): ScaffoldProgressState {
  return {
    steps: SCAFFOLD_STEPS.map(function (entry): ScaffoldStepState {
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
    failedStep: null,
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
  steps: ScaffoldStepState[],
  stepId: ScaffoldStepId,
  patch: Partial<ScaffoldStepState>,
): ScaffoldStepState[] {
  return steps.map(function (step) {
    if (step.id !== stepId) {
      return step;
    }
    return Object.assign({}, step, patch);
  });
}

export type ScaffoldProgressAction =
  | { type: 'scaffold/reset' }
  | { type: 'scaffold/start' }
  | ScaffoldProgressMessage
  | ScaffoldResultMessage
  | ScaffoldErrorMessage;

export function reduceScaffoldProgress(
  state: ScaffoldProgressState,
  action: ScaffoldProgressAction,
): ScaffoldProgressState {
  if (action.type === 'scaffold/reset') {
    return createInitialScaffoldProgressState();
  }

  if (action.type === 'scaffold/start') {
    return Object.assign({}, createInitialScaffoldProgressState(), {
      running: true,
      error: null,
      failedStep: null,
    });
  }

  if (action.type === 'scaffold/error') {
    return Object.assign({}, state, {
      running: false,
      error: action.message,
      failedStep: action.failedStep !== undefined ? action.failedStep : state.failedStep,
    });
  }

  if (action.type === 'scaffold/result') {
    const audits = action.audits.length > 0 ? action.audits.slice() : state.audits.slice();
    return Object.assign({}, state, {
      running: false,
      result: action,
      audits: audits,
      steps: updateStep(state.steps, 'complete', { status: action.ok ? 'done' : 'error' }),
      error: action.ok ? null : 'Scaffold finished with audit failures',
    });
  }

  const progress = action;
  if (progress.type !== 'scaffold/progress') {
    return state;
  }

  if (progress.status === 'error') {
    const erroredSteps = updateStep(state.steps, progress.step, {
      status: 'error',
      detail: progress.detail,
      elapsedMs: progress.elapsedMs,
      audit: progress.audit,
    });
    return Object.assign({}, state, {
      steps: erroredSteps,
      audits: progress.audit !== undefined ? upsertAudit(state.audits, progress.audit) : state.audits,
      running: false,
      error: progress.detail !== undefined ? progress.detail : 'Scaffold step failed',
      failedStep: progress.step,
    });
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

  const stillRunning =
    progress.step !== 'complete' &&
    (progress.status === 'running' || progress.status === 'pending');

  return Object.assign({}, state, {
    steps: nextSteps,
    audits: nextAudits,
    running: stillRunning ? true : state.running,
  });
}

export function countCompletedSteps(steps: ScaffoldStepState[]): number {
  let count = 0;
  for (const step of steps) {
    const status = step.status;
    if (status === 'done' || status === 'skipped') {
      count += 1;
    }
  }
  return count;
}
