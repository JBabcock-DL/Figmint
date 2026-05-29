import { describe, expect, it } from 'vitest';

import { adapt } from '@/io/sources/adapters';
import { isAdaptedTokensV1 } from '@/io/messages/push';
import { countBenchFixtureTokens, loadBenchFixture, type BenchFixtureId } from '@/ui/benchFixtures';

describe('benchFixtures', () => {
  it('bootstrap-complete adapts with tokens in all five collections', () => {
    const doc = loadBenchFixture('bootstrap-complete');
    const result = adapt(doc.payload);
    expect(isAdaptedTokensV1(result)).toBe(true);
    if (!isAdaptedTokensV1(result)) {
      return;
    }
    expect(result.collections).toHaveLength(5);
    const counts = countBenchFixtureTokens('bootstrap-complete');
    expect(counts.primitives).toBeGreaterThan(50);
    expect(counts.theme).toBeGreaterThan(10);
    expect(counts.typography).toBeGreaterThan(50);
    expect(counts.layout).toBeGreaterThan(10);
    expect(counts.effects).toBeGreaterThan(5);
  });

  it('spike-400 is primitives-only by design', () => {
    const doc = loadBenchFixture('spike-400');
    const result = adapt(doc.payload);
    expect(isAdaptedTokensV1(result)).toBe(true);
    if (!isAdaptedTokensV1(result)) {
      return;
    }
    const byCollection: Record<string, number> = {};
    for (const token of result.tokens) {
      byCollection[token.collection] = (byCollection[token.collection] ?? 0) + 1;
    }
    expect(Object.keys(byCollection)).toEqual(['primitives']);
    expect(byCollection.primitives).toBe(400);
  });

  it('every fixture id loads a document', () => {
    const ids: BenchFixtureId[] = ['bootstrap-complete', 'foundations-minimal', 'spike-400'];
    for (const id of ids) {
      const doc = loadBenchFixture(id);
      expect(doc.rawSnippet).toBe(`bench:${id}`);
      expect(adapt(doc.payload)).toSatisfy(isAdaptedTokensV1);
    }
  });
});
