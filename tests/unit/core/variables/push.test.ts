import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import foundationsMinimal from '@/core/variables/__fixtures__/foundations-minimal.v1.json';
import { COLLECTION_ORDER, ensureCollections } from '@/core/variables/collections';
import { pushTokens, resolveAliasAtPush, loadLocalVariableSnapshot } from '@/core/variables/push';
import { createEmptyVarMaps, type PushError } from '@/core/variables/types';
import { installMockFigmaVariables, MockVariable, mockStores } from './__mocks__/figmaVariables';

const tokens = foundationsMinimal as unknown as TokensV1;

describe('push.ts orchestration', () => {
  beforeEach(() => {
    installMockFigmaVariables();
  });

  it('runs five passes in canonical order', async () => {
    const result = await pushTokens(tokens);
    expect(result.passes.map((pass) => pass.collection)).toEqual(COLLECTION_ORDER);
    expect(result.created).toBeGreaterThan(0);
    expect(mockStores.variables.length).toBeGreaterThan(0);
  });

  it('resolves Theme aliases after Primitives pass via varMap', async () => {
    await pushTokens(tokens);
    const themeCollection = mockStores.collections.find((entry) => entry.name === 'Theme');
    expect(themeCollection).toBeDefined();
    const themeVar = mockStores.variables.find(
      (entry) => entry.name === 'color/background/default',
    );
    expect(themeVar).toBeDefined();
    const lightModeId = themeCollection
      ? themeCollection.modes.find((m) => m.name === 'Light')
      : undefined;
    if (themeVar && lightModeId) {
      const value = themeVar.valuesByMode[lightModeId.modeId];
      expect(value).toEqual({ type: 'VARIABLE_ALIAS', id: expect.any(String) as unknown });
    }
  });

  it('second identical run skips all variables', async () => {
    await pushTokens(tokens);
    const second = await pushTokens(tokens);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });

  it('continues remaining passes when Theme variable creation fails', async () => {
    let callCount = 0;
    vi.spyOn(figma.variables, 'createVariable').mockImplementation((name, collection, type) => {
      callCount += 1;
      if (collection.name === 'Theme') {
        throw new Error('Injected Theme failure');
      }
      const variable = new MockVariable(name, collection.id, type);
      mockStores.variables.push(variable);
      return variable as unknown as Variable;
    });

    const result = await pushTokens(tokens);
    expect(
      result.passes.some((pass) => pass.collection === 'theme' && pass.errors.length > 0),
    ).toBe(true);
    expect(result.passes.some((pass) => pass.collection === 'layout')).toBe(true);
    expect(result.passes.some((pass) => pass.collection === 'effects')).toBe(true);
    expect(callCount).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('resolveAliasAtPush returns null and appends error on miss', async () => {
    const snapshot = await loadLocalVariableSnapshot();
    const { collections } = ensureCollections(snapshot);
    const errors: PushError[] = [];
    const varMap = createEmptyVarMaps();
    const alias = resolveAliasAtPush(
      { aliasOf: { collection: 'primitives', name: 'missing' } },
      collections,
      snapshot,
      varMap,
      'theme',
      'color/test',
      errors,
    );
    expect(alias).toBeNull();
    expect(errors.length).toBe(1);
  });

  it('resolveAliasAtPush uses createVariableAlias when target exists', async () => {
    await pushTokens(tokens);
    const snapshot = await loadLocalVariableSnapshot();
    const { collections } = ensureCollections(snapshot);
    const errors: PushError[] = [];
    const varMap = createEmptyVarMaps();
    const primitives = collections.get('primitives');
    expect(primitives).toBeDefined();
    const alias = resolveAliasAtPush(
      { aliasOf: { collection: 'primitives', name: 'color/neutral/100' } },
      collections,
      snapshot,
      varMap,
      'theme',
      'color/test',
      errors,
    );
    expect(alias).toEqual({ type: 'VARIABLE_ALIAS', id: expect.any(String) as unknown });
    expect(errors.length).toBe(0);
  });

  it('applyCodeSyntax is wired through push for non-theme tokens', async () => {
    const codeSyntaxModule = await import('@/core/variables/codeSyntax');
    const syntaxSpy = vi.spyOn(codeSyntaxModule, 'applyCodeSyntax');
    await pushTokens(tokens);
    expect(syntaxSpy.mock.calls.length).toBeGreaterThan(0);
    syntaxSpy.mockRestore();
  });
});

describe('detectPlan.ts', () => {
  beforeEach(() => {
    installMockFigmaVariables();
  });

  it('treats enterprise plan throw as non-Enterprise', async () => {
    const createCollection = figma.variables.createVariableCollection;
    vi.spyOn(figma.variables, 'createVariableCollection').mockImplementation((name: string) => {
      const collection = createCollection(name);
      vi.spyOn(collection, 'extend').mockImplementation(() => {
        throw new Error('Cannot create extended collections outside of enterprise plan.');
      });
      return collection;
    });

    const { isEnterprise } = await import('@/core/variables/detectPlan');
    const result = await isEnterprise();
    expect(result).toBe(false);
    vi.restoreAllMocks();
  });
});
