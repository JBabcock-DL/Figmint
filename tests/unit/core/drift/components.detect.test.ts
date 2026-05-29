import { describe, expect, it } from 'vitest';

import { detectComponentDrift } from '@/core/drift/components';
import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';
import type { ComponentComparable, ComponentDriftDetectInput } from '@/core/drift/types';

import loadingPushFixture from '../../../fixtures/drift/component-button-loading-push.v1.json';
import propPullFixture from '../../../fixtures/drift/component-button-prop-pull.v1.json';
import conflictFixture from '../../../fixtures/drift/component-button-conflict.v1.json';
import chipButtonSpec from '../../../fixtures/component-spec/chip-button-minimal.v1.json';
import { specToComparable } from '@/core/drift/components';
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

interface FixtureComparableInput {
  variantMatrix: Record<string, (string | boolean)[]>;
  props: ComponentComparable['props'];
  bindings: ComponentComparable['bindings'];
}

interface DriftFixture {
  specName: string;
  input: {
    repoSpecs: Record<string, FixtureComparableInput>;
    figmaComponents: Record<string, FixtureComparableInput>;
    snapshotComponents: Record<string, FixtureComparableInput>;
  };
  expected: {
    direction: 'push' | 'pull' | 'conflict';
    variantAdded?: string[];
    propsAdded?: string[];
  };
}

function hydrateComparable(specName: string, input: FixtureComparableInput): ComponentComparable {
  return {
    specName: specName,
    variantMatrixHash: hashVariantMatrix(input.variantMatrix),
    variantMatrix: input.variantMatrix,
    props: input.props,
    bindings: input.bindings,
  };
}

function hydrateInput(fixture: DriftFixture): ComponentDriftDetectInput {
  const specName = fixture.specName;
  const repoSpecs: Record<string, ComponentComparable> = {};
  const figmaComponents: Record<string, ComponentComparable> = {};
  const snapshotComponents: Record<string, ComponentComparable> = {};

  for (const key of Object.keys(fixture.input.repoSpecs)) {
    repoSpecs[key] = hydrateComparable(specName, fixture.input.repoSpecs[key]);
  }
  for (const key of Object.keys(fixture.input.figmaComponents)) {
    figmaComponents[key] = hydrateComparable(specName, fixture.input.figmaComponents[key]);
  }
  for (const key of Object.keys(fixture.input.snapshotComponents)) {
    snapshotComponents[key] = hydrateComparable(specName, fixture.input.snapshotComponents[key]);
  }

  return { repoSpecs, figmaComponents, snapshotComponents };
}

describe('detectComponentDrift fixtures', () => {
  it('classifies loading variant push', () => {
    const fixture = loadingPushFixture as DriftFixture;
    const result = detectComponentDrift(hydrateInput(fixture));
    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0].direction).toBe(fixture.expected.direction);
    const payload = result.drifts[0].figma as { diff?: { variantMatrix?: { added: string[] } } };
    if (fixture.expected.variantAdded !== undefined) {
      expect(payload.diff?.variantMatrix !== undefined).toBe(true);
      if (payload.diff?.variantMatrix !== undefined) {
        expect(payload.diff.variantMatrix.added).toEqual(fixture.expected.variantAdded);
      }
    }
  });

  it('classifies repo prop pull', () => {
    const fixture = propPullFixture as DriftFixture;
    const result = detectComponentDrift(hydrateInput(fixture));
    expect(result.drifts[0].direction).toBe('pull');
  });

  it('classifies both-sides conflict', () => {
    const fixture = conflictFixture as DriftFixture;
    const result = detectComponentDrift(hydrateInput(fixture));
    expect(result.drifts[0].direction).toBe('conflict');
  });

  it('round-trips chip-button-minimal spec', () => {
    const spec = chipButtonSpec as ComponentSpecV1;
    const comparable = specToComparable(spec);
    expect(comparable.specName).toBe('Button');
    expect(comparable.variantMatrix.variant).toEqual(['default']);
  });
});
