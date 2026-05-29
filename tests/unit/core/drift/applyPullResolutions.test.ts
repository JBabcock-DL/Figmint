import { describe, expect, it, vi } from 'vitest';

import {
  applyPullResolutions,
  applyVariablePullDrifts,
  buildTokensFromVariablePullDrifts,
  collectPullDrifts,
} from '@/core/drift/applyPullResolutions';
import type { DriftReportV1, VariableDriftEntry } from '@detroitlabs/fighub-contracts';

vi.mock('@/core/variables', function () {
  return {
    pushTokens: vi.fn().mockResolvedValue({
      created: 1,
      updated: 0,
      skipped: 0,
      errors: [],
      passes: 1,
      evc: 0,
      totalDurationMs: 1,
    }),
  };
});

vi.mock('@/core/components/scaffold/runScaffold', function () {
  return {
    runScaffoldComponent: vi.fn().mockResolvedValue({ ok: true }),
  };
});

vi.mock('@/core/sync/snapshotStore', function () {
  return {
    updateSnapshotKeys: vi.fn(),
  };
});

import { pushTokens } from '@/core/variables';
import { runScaffoldComponent } from '@/core/components/scaffold/runScaffold';
import { updateSnapshotKeys } from '@/core/sync/snapshotStore';
import { buildComponentDriftEntry } from '@/core/drift/components';

function variablePullDrift(id: string, repoValue: number): VariableDriftEntry {
  return {
    id: id,
    kind: 'variable',
    direction: 'pull',
    figma: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: repoValue - 1 },
      codeSyntax: {},
    },
    repo: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: repoValue },
      codeSyntax: {},
    },
    lastSynced: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: repoValue - 1 },
      codeSyntax: {},
    },
  };
}

describe('applyPullResolutions', () => {
  it('builds token doc from variable pull drifts', () => {
    const drifts = [variablePullDrift('var/Layout/gap-2', 8)];
    const tokensDoc = buildTokensFromVariablePullDrifts(drifts);
    expect(tokensDoc.tokens).toHaveLength(1);
    expect(tokensDoc.tokens[0].collection).toBe('layout');
    expect(tokensDoc.tokens[0].name).toBe('gap-2');
  });

  it('applies variable pulls via pushTokens', async () => {
    const drifts = [variablePullDrift('var/Theme/elevation-1', 4)];
    const count = await applyVariablePullDrifts(drifts);
    expect(count).toBe(1);
    expect(pushTokens).toHaveBeenCalled();
  });

  it('partitions pull drifts and updates snapshot keys', async () => {
    const componentDrift = buildComponentDriftEntry(
      'Button',
      'pull',
      {
        specName: 'Button',
        variantMatrixHash: 'figma',
        variantMatrix: { variant: ['default'] },
        props: [],
        bindings: [],
      },
      {
        specName: 'Button',
        variantMatrixHash: 'repo',
        variantMatrix: { variant: ['default', 'primary'] },
        props: [],
        bindings: [],
      },
      null,
    );

    const report: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-05-28T00:00:00.000Z',
        figmaFileKey: 'demo',
        repoUrl: 'https://github.com/detroitlabs/fighub',
      },
      summary: { push: 0, pull: 2, conflict: 0, synced: 0 },
      drifts: [variablePullDrift('var/Layout/gap-4', 16), componentDrift],
    };

    const partitioned = collectPullDrifts(report, {}, ['var/Layout/gap-4', 'cmp/button']);
    expect(partitioned.variables).toHaveLength(1);
    expect(partitioned.components).toHaveLength(1);

    const applied = await applyPullResolutions({
      report: report,
      resolutions: {},
      driftIds: ['var/Layout/gap-4', 'cmp/button'],
      repoSpecs: {
        Button: {
          v: 1,
          kind: 'component-spec',
          name: 'Button',
          framework: 'react',
          variantMatrix: { variant: ['default', 'primary'] },
          props: [],
          bindings: [],
          layout: {
            direction: 'horizontal',
            gap: '8',
            sizing: { horizontal: 'hug', vertical: 'hug' },
          },
        },
      },
    });

    expect(applied).toBe(2);
    expect(runScaffoldComponent).toHaveBeenCalled();
    expect(updateSnapshotKeys).toHaveBeenCalled();
  });
});
