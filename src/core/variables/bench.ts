import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { pushTokens } from './push';
import type { PushResult } from './types';

export interface PushBenchResult {
  label: string;
  totalDurationMs: number;
  created: number;
  updated: number;
  skipped: number;
  passes: PushResult['passes'];
}

/** Dev bench wrapper — logs timing and returns compact stats. */
export async function runPushBench(tokens: TokensV1, label?: string): Promise<PushBenchResult> {
  const benchLabel = label !== undefined && label !== '' ? label : 'push-bench';
  const started = Date.now();
  const result = await pushTokens(tokens);
  const totalDurationMs = Date.now() - started;

  console.debug('[bench] push complete', {
    label: benchLabel,
    totalDurationMs: totalDurationMs,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors.length,
  });

  return {
    label: benchLabel,
    totalDurationMs: result.totalDurationMs,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    passes: result.passes,
  };
}

export const PUSH_BENCH_RESULT_TYPE = 'PUSH_BENCH_RESULT';

export interface PushBenchResultMessage {
  type: typeof PUSH_BENCH_RESULT_TYPE;
  result: PushBenchResult;
}

export function isPushBenchResultMessage(message: unknown): message is PushBenchResultMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const record = message as Record<string, unknown>;
  return record.type === PUSH_BENCH_RESULT_TYPE;
}
