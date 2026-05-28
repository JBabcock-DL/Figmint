import type {
  ComponentDriftEntry,
  DriftReportMeta,
  DriftReportV1,
  VariableDriftEntry,
} from '@detroitlabs/fighub-contracts';

export interface BuildDriftReportInput {
  variableDrifts: VariableDriftEntry[];
  componentDrifts: ComponentDriftEntry[];
  meta: DriftReportMeta;
  syncedCount: number;
}

export function buildDriftReport(input: BuildDriftReportInput): DriftReportV1 {
  const drifts = input.variableDrifts.concat(input.componentDrifts).sort(function (left, right) {
    return left.id.localeCompare(right.id);
  });

  let push = 0;
  let pull = 0;
  let conflict = 0;
  for (let i = 0; i < drifts.length; i++) {
    const direction = drifts[i].direction;
    if (direction === 'push') {
      push += 1;
    } else if (direction === 'pull') {
      pull += 1;
    } else if (direction === 'conflict') {
      conflict += 1;
    }
  }

  if (push + pull + conflict !== drifts.length) {
    throw new Error('Drift summary invariant failed: direction counts do not match drifts length');
  }

  return {
    v: 1,
    kind: 'drift-report',
    meta: input.meta,
    summary: {
      push: push,
      pull: pull,
      conflict: conflict,
      synced: input.syncedCount,
    },
    drifts: drifts,
  };
}
