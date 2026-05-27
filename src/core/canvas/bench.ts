import { pluginLog } from '@/core/pluginLog';

export interface CanvasBenchResult {
  label: string;
  totalDurationMs: number;
  swatchCount: number;
}

/** Dev bench wrapper — logs canvas-only timing (excludes push). */
export async function runCanvasBench(
  label: string,
  buildFn: () => Promise<{ swatchCount: number }>,
): Promise<CanvasBenchResult> {
  const benchLabel = label !== undefined && label !== '' ? label : 'canvas-bench';
  const started = Date.now();
  const outcome = await buildFn();
  const totalDurationMs = Date.now() - started;

  pluginLog('[bench] canvas complete', {
    label: benchLabel,
    totalDurationMs: totalDurationMs,
    swatchCount: outcome.swatchCount,
  });

  return {
    label: benchLabel,
    totalDurationMs: totalDurationMs,
    swatchCount: outcome.swatchCount,
  };
}

export const CANVAS_BENCH_RESULT_TYPE = 'CANVAS_BENCH_RESULT';

export interface CanvasBenchResultMessage {
  type: typeof CANVAS_BENCH_RESULT_TYPE;
  result: CanvasBenchResult;
}

export function isCanvasBenchResultMessage(message: unknown): message is CanvasBenchResultMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const record = message as Record<string, unknown>;
  return record.type === CANVAS_BENCH_RESULT_TYPE;
}
