import { describe, expect, it, beforeEach } from 'vitest';

import { COLLECTION_MODES, ensureModes } from '@/core/variables/modes';
import { ensureCollections } from '@/core/variables/collections';
import { loadLocalVariableSnapshot } from '@/core/variables/push';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import foundationsMinimal from '@/core/variables/__fixtures__/foundations-minimal.v1.json';
import { installMockFigmaVariables } from './__mocks__/figmaVariables';

const tokens = foundationsMinimal as unknown as TokensV1;

describe('modes.ts', () => {
  beforeEach(() => {
    installMockFigmaVariables();
  });

  it('reconciles Theme modes to Light and Dark', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    const { collections } = ensureCollections(snapshot);
    const modeMaps = ensureModes(collections, tokens);
    const themeModes = Object.keys(modeMaps.theme).sort();
    expect(themeModes).toEqual(['Dark', 'Light']);
  });

  it('reconciles Typography to eight scale modes with default renamed to 100', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    const { collections } = ensureCollections(snapshot);
    const modeMaps = ensureModes(collections, tokens);
    expect(Object.keys(modeMaps.typography).sort()).toEqual(
      COLLECTION_MODES.typography.modes.sort(),
    );
  });

  it('reconciles Primitives and Layout to Default', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    const { collections } = ensureCollections(snapshot);
    const modeMaps = ensureModes(collections, tokens);
    expect(Object.keys(modeMaps.primitives)).toEqual(['Default']);
    expect(Object.keys(modeMaps.layout)).toEqual(['Default']);
  });
});
