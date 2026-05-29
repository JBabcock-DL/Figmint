import type { ComponentSpecV1, DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';
import type { RepoTokensWireFormat } from '@/io/sources/adapters/serializeTokensWire';

import type { ResolutionChoice } from '@/io/messages/drift';

export async function requestBulkPush(input: {
  repoUrl: string;
  report: DriftReportV1;
  driftIds: string[];
  resolutions: Record<string, ResolutionChoice>;
  repoTokens: TokensV1;
  tokensPath: string;
  specsPath?: string;
  repoSpecs?: { name: string; spec: ComponentSpecV1 }[];
  tokensWireFormat?: RepoTokensWireFormat;
}): Promise<
  { ok: true; prUrl: string; warning?: string } | { ok: false; error: string }
> {
  return new Promise(function (resolve) {
    const requestId = 'resolution-push-' + String(Date.now());

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
        resolve({
          ok: true,
          prUrl: typed.prUrl,
          warning: typeof typed.warning === 'string' ? typed.warning : undefined,
        });
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
          resolutions: input.resolutions,
          driftIds: input.driftIds,
          repoTokens: input.repoTokens,
          tokensPath: input.tokensPath,
          specsPath: input.specsPath,
          repoSpecs: input.repoSpecs,
          tokensWireFormat: input.tokensWireFormat ?? 'dtcg',
        },
      },
      '*',
    );
  });
}

export async function requestBulkPull(input: {
  report: DriftReportV1;
  driftIds: string[];
  resolutions: Record<string, ResolutionChoice>;
  repoSpecs?: { name: string; spec: ComponentSpecV1 }[];
}): Promise<{ ok: true; appliedCount: number } | { ok: false; error: string; appliedCount?: number }> {
  return new Promise(function (resolve) {
    const requestId = 'resolution-pull-' + String(Date.now());

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
          resolutions: input.resolutions,
          driftIds: input.driftIds,
          repoSpecs: input.repoSpecs,
        },
      },
      '*',
    );
  });
}

export async function requestSinglePull(input: {
  report: DriftReportV1;
  driftId: string;
  resolutions: Record<string, ResolutionChoice>;
  repoSpecs?: { name: string; spec: ComponentSpecV1 }[];
}): Promise<{ ok: true; appliedCount: number } | { ok: false; error: string }> {
  return requestBulkPull({
    report: input.report,
    driftIds: [input.driftId],
    resolutions: input.resolutions,
    repoSpecs: input.repoSpecs,
  }).then(function (result) {
    if (result.ok) {
      return { ok: true, appliedCount: result.appliedCount };
    }
    return { ok: false, error: result.error };
  });
}
