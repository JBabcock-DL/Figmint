import { describe, expect, it } from 'vitest';

import {
  detectVariableDrift,
  flattenFigmaVariableSnapshots,
  flattenRepoTokens,
} from '@/core/drift/variables';
import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import type { VariableDriftDetectInput } from '@/core/drift/types';

import acFixture from '../../../fixtures/drift/variable-drift-ac-10.v1.json';
import tokensMinimal from '../../../fixtures/audit/tokens-minimal.v1.json';

interface AcFixture {
  input: VariableDriftDetectInput;
  expected: { driftCount: number; syncedCount: number };
}

describe('variable drift integration', () => {
  it('end-to-end: repo flatten + mock figma flatten + detect yields six drifts', () => {
    const fixture = acFixture as AcFixture;

    const figmaCollections: FigmaCollectionSnapshot[] = [];
    for (const key of Object.keys(fixture.input.figmaTokens)) {
      const slashIndex = key.indexOf('/');
      const collectionName = key.slice(0, slashIndex);
      const variableName = key.slice(slashIndex + 1);
      const comparable = fixture.input.figmaTokens[key];
      let collection = figmaCollections.find(function (entry) {
        return entry.name === collectionName;
      });
      if (!collection) {
        collection = {
          id: 'VC:' + collectionName,
          name: collectionName,
          modes: [{ modeId: 'M:1', name: 'Default' }],
          variables: [],
        };
        figmaCollections.push(collection);
      }
      collection.variables.push({
        id: 'V:' + key,
        name: variableName,
        collectionId: collection.id,
        collectionName: collectionName,
        resolvedType: comparable.resolvedType,
        valuesByMode: comparable.valuesByMode,
        codeSyntax: comparable.codeSyntax,
      });
    }

    const repoFromWire = flattenRepoTokens(tokensMinimal);
    const figmaFromWire = flattenFigmaVariableSnapshots(figmaCollections);

    expect(Object.keys(repoFromWire).length).toBeGreaterThan(0);
    expect(Object.keys(figmaFromWire).length).toBe(10);

    const result = detectVariableDrift({
      figmaTokens: fixture.input.figmaTokens,
      repoTokens: fixture.input.repoTokens,
      snapshotTokens: fixture.input.snapshotTokens,
    });

    expect(result.drifts).toHaveLength(fixture.expected.driftCount);
    expect(result.syncedCount).toBe(fixture.expected.syncedCount);
  });
});
