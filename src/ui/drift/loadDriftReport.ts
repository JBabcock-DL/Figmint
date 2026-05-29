import type { ComponentSpecV1, DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

export interface RequestDriftReportInput {
  repoUrl: string;
  repoTokens: TokensV1;
  repoSpecs: { name: string; spec: ComponentSpecV1 }[];
  quickDetect?: boolean;
}

export async function requestDriftReport(input: RequestDriftReportInput): Promise<DriftReportV1> {
  return new Promise(function (resolve, reject) {
    const requestId = 'drift-report-' + String(Date.now());

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
      if (typed.type !== 'drift/build-report/result' || typed.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      if (typed.ok !== true || typed.report === undefined) {
        reject(
          new Error(typeof typed.error === 'string' ? typed.error : 'Drift report build failed'),
        );
        return;
      }
      resolve(typed.report as DriftReportV1);
    }

    window.addEventListener('message', onMessage);
    parent.postMessage(
      {
        pluginMessage: {
          type: 'drift/build-report',
          requestId: requestId,
          repoUrl: input.repoUrl,
          repoTokens: input.repoTokens,
          repoSpecs: input.repoSpecs,
          quickDetect: input.quickDetect,
        },
      },
      '*',
    );
  });
}
