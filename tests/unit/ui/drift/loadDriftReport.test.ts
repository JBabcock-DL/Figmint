import { describe, expect, it, vi } from 'vitest';

import { requestDriftReport } from '@/ui/drift/loadDriftReport';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import tokensPayload from '../../../fixtures/ui/export/tokens.json';
import componentSpecPayload from '../../../fixtures/ui/export/component-spec.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

describe('requestDriftReport', () => {
  it('returns report from drift/build-report/result message', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const reportPromise = requestDriftReport({
      repoUrl: 'https://github.com/detroitlabs/fighub',
      repoTokens: tokensPayload as import('@detroitlabs/fighub-contracts').TokensV1,
      repoSpecs: [{ name: 'Button', spec: componentSpecPayload as import('@detroitlabs/fighub-contracts').ComponentSpecV1 }],
    });

    const requestId = postMessage.mock.calls[0][0].pluginMessage.requestId as string;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'drift/build-report/result',
            requestId: requestId,
            ok: true,
            report: driftPayload as DriftReportV1,
          },
        },
      }),
    );

    const report = await reportPromise;
    expect(report.kind).toBe('drift-report');
  });
});
