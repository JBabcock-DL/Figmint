import { describe, expect, it } from 'vitest';

import {
  buildPushCommitFiles,
  effectiveResolutionDirection,
  resolutionsForBulkPush,
} from '@/core/drift/applyPushResolutions';
import { buildComponentDriftEntry } from '@/core/drift/components';
import type {
  ComponentSpecV1,
  DriftReportV1,
  TokensV1,
  VariableDriftEntry,
} from '@detroitlabs/fighub-contracts';

import baseTokens from '../../../fixtures/ui/export/tokens.json';
import buttonSpec from '../../../fixtures/component-spec/chip-button-minimal.v1.json';

const repoTokens = baseTokens as unknown as TokensV1;
const buttonComponentSpec = buttonSpec as ComponentSpecV1;

function variableDrift(
  id: string,
  direction: 'push' | 'pull' | 'conflict',
  figmaValue: number,
  repoValue: number,
): VariableDriftEntry {
  return {
    id: id,
    kind: 'variable',
    direction: direction,
    figma: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: figmaValue },
      codeSyntax: {},
    },
    repo: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: repoValue },
      codeSyntax: {},
    },
    lastSynced: {
      resolvedType: 'FLOAT',
      valuesByMode: { Default: repoValue },
      codeSyntax: {},
    },
  };
}

describe('buildPushCommitFiles', () => {
  it('stages merged tokens plus component spec for push selections', () => {
    const componentDrift = buildComponentDriftEntry(
      'Button',
      'push',
      {
        specName: 'Button',
        variantMatrixHash: 'figma-hash',
        variantMatrix: { variant: ['default', 'primary'] },
        props: [],
        bindings: [],
      },
      {
        specName: 'Button',
        variantMatrixHash: 'repo-hash',
        variantMatrix: { variant: ['default'] },
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
      summary: { push: 3, pull: 0, conflict: 0, synced: 0 },
      drifts: [
        variableDrift('var/Layout/spacing-4', 'push', 16, 12),
        variableDrift('var/Theme/radius-md', 'push', 8, 6),
        componentDrift,
      ],
    };

    const files = buildPushCommitFiles({
      report: report,
      resolutions: {},
      driftIds: ['var/Layout/spacing-4', 'var/Theme/radius-md', 'cmp/button'],
      baseTokens: repoTokens,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
      repoSpecs: { Button: buttonComponentSpec },
      tokensWireFormat: 'canonical',
    });

    expect(files).toHaveLength(2);
    const tokensFile = files.find(function (file) {
      return file.path === 'design/tokens.json';
    });
    expect(tokensFile).toBeDefined();
    const parsedTokens = JSON.parse(
      tokensFile !== undefined ? tokensFile.content : '{}',
    ) as TokensV1;
    expect(parsedTokens.kind).toBe('tokens');
    const spacingToken = parsedTokens.tokens.find(function (token) {
      return token.collection === 'layout' && token.name === 'spacing-4';
    });
    const radiusToken = parsedTokens.tokens.find(function (token) {
      return token.collection === 'theme' && token.name === 'radius-md';
    });
    expect(spacingToken !== undefined && spacingToken.valuesByMode.Default).toBe(16);
    expect(radiusToken !== undefined && radiusToken.valuesByMode.Default).toBe(8);

    const specFile = files.find(function (file) {
      return file.path === 'components/button.json';
    });
    expect(specFile).toBeDefined();
    const parsedSpec = JSON.parse(
      specFile !== undefined ? specFile.content : '{}',
    ) as ComponentSpecV1;
    expect(parsedSpec.variantMatrix).toEqual({ variant: ['default', 'primary'] });
    expect(parsedSpec.framework).toBe('react');
  });

  it('honors conflict resolution choice push', () => {
    const drift = variableDrift('var/Layout/spacing-8', 'conflict', 24, 20);
    const report: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-05-28T00:00:00.000Z',
        figmaFileKey: 'demo',
        repoUrl: 'https://github.com/detroitlabs/fighub',
      },
      summary: { push: 0, pull: 0, conflict: 1, synced: 0 },
      drifts: [drift],
    };

    expect(effectiveResolutionDirection(drift, { 'var/Layout/spacing-8': { type: 'push' } })).toBe(
      'push',
    );
    expect(effectiveResolutionDirection(drift, {})).toBeNull();

    const files = buildPushCommitFiles({
      report: report,
      resolutions: { 'var/Layout/spacing-8': { type: 'push' } },
      driftIds: ['var/Layout/spacing-8'],
      baseTokens: repoTokens,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
    });
    expect(files).toHaveLength(1);
  });

  it('writes DTCG wire JSON when tokensWireFormat is dtcg', () => {
    const drift = variableDrift('var/Layout/spacing-4', 'push', 16, 12);
    const report: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-05-28T00:00:00.000Z',
        figmaFileKey: 'demo',
        repoUrl: 'https://github.com/detroitlabs/fighub',
      },
      summary: { push: 1, pull: 0, conflict: 0, synced: 0 },
      drifts: [drift],
    };
    const files = buildPushCommitFiles({
      report: report,
      resolutions: {},
      driftIds: ['var/Layout/spacing-4'],
      baseTokens: repoTokens,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
      tokensWireFormat: 'dtcg',
    });
    const tokensFile = files[0];
    const parsed = JSON.parse(tokensFile.content) as Record<string, unknown>;
    expect(parsed.kind).toBeUndefined();
    expect(parsed.layout !== undefined || parsed.primitives !== undefined).toBe(true);
  });

  it('bulk push includes selected push drifts even when marked skip', () => {
    const drift = variableDrift('var/Layout/spacing-4', 'push', 16, 12);
    const report: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-05-28T00:00:00.000Z',
        figmaFileKey: 'demo',
        repoUrl: 'https://github.com/detroitlabs/fighub',
      },
      summary: { push: 1, pull: 0, conflict: 0, synced: 0 },
      drifts: [drift],
    };
    const resolutions = { 'var/Layout/spacing-4': { type: 'skip' as const } };
    const bulkResolutions = resolutionsForBulkPush(report, resolutions, ['var/Layout/spacing-4']);
    const files = buildPushCommitFiles({
      report: report,
      resolutions: bulkResolutions,
      driftIds: ['var/Layout/spacing-4'],
      baseTokens: repoTokens,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
    });
    expect(files).toHaveLength(1);
  });
});
