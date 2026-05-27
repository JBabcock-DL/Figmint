import { describe, expect, it, beforeEach } from 'vitest';

import { ensureCollections } from '@/core/variables/collections';
import { loadLocalVariableSnapshot } from '@/core/variables/push';

import {
  findCollectionByName,
  installMockFigmaVariables,
  mockStores,
} from './__mocks__/figmaVariables';

describe('collections.ts', () => {
  beforeEach(() => {
    installMockFigmaVariables();
  });

  it('creates all five collections on first call', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    const result = ensureCollections(snapshot);
    expect(result.created).toBe(5);
    expect(result.reused).toBe(0);
    expect(result.collections.size).toBe(5);
    expect(findCollectionByName('Primitives')).toBeDefined();
    expect(findCollectionByName('Effects')).toBeDefined();
  });

  it('reuses collections on second call without creating new ones', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    ensureCollections(snapshot);
    const beforeCount = mockStores.collections.length;
    const second = ensureCollections(snapshot);
    expect(second.created).toBe(0);
    expect(second.reused).toBe(5);
    expect(mockStores.collections.length).toBe(beforeCount);
  });
});
