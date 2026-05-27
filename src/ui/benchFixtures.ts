import type { LoadedDocument } from '@/io/sources/types';

import bootstrapComplete from '@/core/variables/__fixtures__/bootstrap-complete.v1.json';
import foundationsMinimal from '@/core/variables/__fixtures__/foundations-minimal.v1.json';
import spike400 from '../../.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/scripts/fixtures/spike-400.json';

export type BenchFixtureId = 'bootstrap-complete' | 'foundations-minimal' | 'spike-400';

const BENCH_FIXTURES: Record<BenchFixtureId, { label: string; payload: unknown }> = {
  'bootstrap-complete': {
    label: 'Bootstrap complete (all 5 collections — use for VQA)',
    payload: bootstrapComplete,
  },
  'foundations-minimal': {
    label: 'Foundations minimal (6 tokens — adapter smoke)',
    payload: foundationsMinimal,
  },
  'spike-400': {
    label: 'WO-005 spike-400 (400 colors only — push latency bench)',
    payload: spike400,
  },
};

export const BENCH_FIXTURE_OPTIONS = Object.entries(BENCH_FIXTURES).map(([id, meta]) => ({
  id: id as BenchFixtureId,
  label: meta.label,
}));

export function loadBenchFixture(id: BenchFixtureId): LoadedDocument {
  const entry = BENCH_FIXTURES[id];
  const receivedAt = new Date().toISOString();
  return {
    kind: 'tokens-dtcg',
    payload: entry.payload,
    sourceMeta: {
      port: 'paste',
      receivedAt,
      charLength: JSON.stringify(entry.payload).length,
    },
    rawSnippet: `bench:${id}`,
  };
}

/** Per-collection token counts after adapt (for preview assertions in tests). */
export function countBenchFixtureTokens(id: BenchFixtureId): Record<string, number> {
  const payload = BENCH_FIXTURES[id].payload as {
    tokens: Array<{ collection: string }>;
  };
  const counts: Record<string, number> = {};
  for (const token of payload.tokens) {
    counts[token.collection] = (counts[token.collection] ?? 0) + 1;
  }
  return counts;
}
