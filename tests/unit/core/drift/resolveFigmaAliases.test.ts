import { describe, expect, it } from 'vitest';

import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import { detectVariableDrift, flattenFigmaVariableSnapshots } from '@/core/drift/variables';
import { buildPushCommitFiles } from '@/core/drift/applyPushResolutions';
import type { DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

function figmaCollectionsFixture(): FigmaCollectionSnapshot[] {
  return [
    {
      id: 'VC:prim',
      name: 'Primitives',
      modes: [{ modeId: 'M:def', name: 'Default' }],
      variables: [
        {
          id: 'V:space300',
          name: 'Space/300',
          collectionId: 'VC:prim',
          collectionName: 'Primitives',
          resolvedType: 'FLOAT',
          valuesByMode: { Default: 12 },
          codeSyntax: {},
        },
        {
          id: 'V:neutral50',
          name: 'color/neutral/50',
          collectionId: 'VC:prim',
          collectionName: 'Primitives',
          resolvedType: 'COLOR',
          valuesByMode: { Default: { r: 0.08, g: 0.08, b: 0.08, a: 1 } },
          codeSyntax: {},
        },
      ],
    },
    {
      id: 'VC:layout',
      name: 'Layout',
      modes: [{ modeId: 'M:def', name: 'Default' }],
      variables: [
        {
          id: 'V:spaceMd',
          name: 'space/md',
          collectionId: 'VC:layout',
          collectionName: 'Layout',
          resolvedType: 'FLOAT',
          valuesByMode: { Default: { type: 'VARIABLE_ALIAS', id: 'V:space300' } },
          codeSyntax: { WEB: 'var(--space-md)' },
        },
      ],
    },
    {
      id: 'VC:theme',
      name: 'Theme',
      modes: [
        { modeId: 'M:light', name: 'Light' },
        { modeId: 'M:dark', name: 'Dark' },
      ],
      variables: [
        {
          id: 'V:bgDefault',
          name: 'color/background/default',
          collectionId: 'VC:theme',
          collectionName: 'Theme',
          resolvedType: 'COLOR',
          valuesByMode: {
            Light: { type: 'VARIABLE_ALIAS', id: 'V:neutral50' },
            Dark: { type: 'VARIABLE_ALIAS', id: 'V:neutral50' },
          },
          codeSyntax: {},
        },
      ],
    },
    {
      id: 'VC:doc',
      name: 'Documentation',
      modes: [{ modeId: 'M:def', name: 'Default' }],
      variables: [
        {
          id: 'V:docSurface',
          name: 'doc/table/surface',
          collectionId: 'VC:doc',
          collectionName: 'Documentation',
          resolvedType: 'COLOR',
          valuesByMode: { Default: { r: 0.97, g: 0.97, b: 0.97, a: 1 } },
          codeSyntax: {},
        },
      ],
    },
  ];
}

describe('resolveFigmaAliases integration', () => {
  it('resolves alias-backed layout/theme tokens for drift compare and push', () => {
    const collections = figmaCollectionsFixture();
    const raw = flattenFigmaVariableSnapshots(collections);
    expect(raw['Layout/space/md'].valuesByMode.Default).toEqual({
      type: 'VARIABLE_ALIAS',
      id: 'V:space300',
    });
    expect(raw['Documentation/doc/table/surface']).toBeDefined();

    const resolved = flattenFigmaVariableSnapshots(collections, { resolveAliases: true });
    expect(resolved['Layout/space/md'].valuesByMode.Default).toBe(12);
    expect(resolved['Theme/color/background/default'].valuesByMode.Light).toEqual({
      r: 0.08,
      g: 0.08,
      b: 0.08,
      a: 1,
    });
    expect(resolved['Documentation/doc/table/surface']).toBeUndefined();

    const drift = detectVariableDrift({
      figmaTokens: resolved,
      repoTokens: {},
      snapshotTokens: {},
    });
    const layoutDrift = drift.drifts.find(function (d) {
      return d.id === 'var/Layout/space/md';
    });
    expect(layoutDrift?.direction).toBe('push');

    const report: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-05-29T00:00:00.000Z',
        figmaFileKey: 'demo',
        repoUrl: 'https://github.com/acme/widgets',
      },
      summary: { push: 1, pull: 0, conflict: 0, synced: 0 },
      drifts: layoutDrift !== undefined ? [layoutDrift] : [],
    };

    const baseTokens: TokensV1 = {
      v: 1,
      kind: 'tokens',
      collections: [{ id: 'layout', modes: ['Default'] }],
      tokens: [],
    };

    const files = buildPushCommitFiles({
      report: report,
      resolutions: {},
      driftIds: ['var/Layout/space/md'],
      baseTokens: baseTokens,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
    });

    expect(files.length).toBe(1);
    expect(files[0].content).toContain('"md"');
    expect(files[0].content).toContain('12px');
  });
});
