import type { ComponentSpecV1, DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { ResolutionChoice } from '@/io/messages/drift';
import type { ResolutionState } from '@/ui/drift/resolutionReducer';

function resolutionsRecord(state: ResolutionState): Record<string, ResolutionChoice> {
  const record: Record<string, ResolutionChoice> = {};
  for (const entry of state.resolutions.entries()) {
    record[entry[0]] = entry[1];
  }
  return record;
}

export async function requestBulkPush(input: {
  repoUrl: string;
  report: DriftReportV1;
  state: ResolutionState;
  repoTokens: TokensV1;
  tokensPath: string;
  specsPath?: string;
  repoSpecs?: Array<{ name: string; spec: ComponentSpecV1 }>;
}): Promise<{ ok: true; prUrl: string } | { ok: false; error: string }> {
  return new Promise(function (resolve) {
    const requestId = 'resolution-push-' + String(Date.now());
    const driftIds = Array.from(input.state.selectedIds);

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
        return;
      }
      const msg = (data as { pluginMessage: unknown }).pluginMessage;
      if (typeof msg !== 'object' || msg === null) {
        return;
      }
      const typed = msg as Record<string, unknown>;
      if (typed.type !== 'resolution/bulk-result' || typed.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      if (typed.ok === true && typeof typed.prUrl === 'string') {
        resolve({ ok: true, prUrl: typed.prUrl });
        return;
      }
      resolve({
        ok: false,
        error: typeof typed.error === 'string' ? typed.error : 'Bulk push failed',
      });
    }

    window.addEventListener('message', onMessage);
    parent.postMessage(
      {
        pluginMessage: {
          type: 'resolution/bulk-push',
          requestId: requestId,
          repoUrl: input.repoUrl,
          report: input.report,
          resolutions: resolutionsRecord(input.state),
          driftIds: driftIds,
          repoTokens: input.repoTokens,
          tokensPath: input.tokensPath,
          specsPath: input.specsPath,
          repoSpecs: input.repoSpecs,
        },
      },
      '*',
    );
  });
}

export async function requestBulkPull(input: {
  report: DriftReportV1;
  state: ResolutionState;
  repoSpecs?: Array<{ name: string; spec: ComponentSpecV1 }>;
}): Promise<{ ok: true; appliedCount: number } | { ok: false; error: string; appliedCount?: number }> {
  return new Promise(function (resolve) {
    const requestId = 'resolution-pull-' + String(Date.now());
    const driftIds = Array.from(input.state.selectedIds);

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
        return;
      }
      const msg = (data as { pluginMessage: unknown }).pluginMessage;
      if (typeof msg !== 'object' || msg === null) {
        return;
      }
      const typed = msg as Record<string, unknown>;
      if (typed.type !== 'resolution/bulk-result' || typed.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      if (typed.ok === true) {
        resolve({
          ok: true,
          appliedCount: typeof typed.appliedCount === 'number' ? typed.appliedCount : 0,
        });
        return;
      }
      resolve({
        ok: false,
        error: typeof typed.error === 'string' ? typed.error : 'Bulk pull failed',
        appliedCount: typeof typed.appliedCount === 'number' ? typed.appliedCount : undefined,
      });
    }

    window.addEventListener('message', onMessage);
    parent.postMessage(
      {
        pluginMessage: {
          type: 'resolution/bulk-pull',
          requestId: requestId,
          report: input.report,
          resolutions: resolutionsRecord(input.state),
          driftIds: driftIds,
          repoSpecs: input.repoSpecs,
        },
      },
      '*',
    );
  });
}
