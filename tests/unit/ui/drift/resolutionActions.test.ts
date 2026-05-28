import { describe, expect, it, vi } from 'vitest';

import { requestBulkPush } from '@/ui/drift/resolutionActions';
import { createInitialResolutionState } from '@/ui/drift/resolutionReducer';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import tokensPayload from '../../../fixtures/ui/export/tokens.json';
import type { DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

describe('requestBulkPush', () => {
  it('posts resolution/bulk-push and resolves prUrl from bulk-result', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const state = createInitialResolutionState();
    state.report = driftPayload as DriftReportV1;
    state.selectedIds.add('cmp/button/primary');

    const resultPromise = requestBulkPush({
      repoUrl: 'https://github.com/detroitlabs/fighub',
      report: driftPayload as DriftReportV1,
      state: state,
      repoTokens: tokensPayload as unknown as TokensV1,
      tokensPath: 'design/tokens.json',
      specsPath: 'components/',
    });

    const requestId = postMessage.mock.calls[0][0].pluginMessage.requestId as string;
    expect(postMessage.mock.calls[0][0].pluginMessage.type).toBe('resolution/bulk-push');

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'resolution/bulk-result',
            requestId: requestId,
            ok: true,
            prUrl: 'https://github.com/detroitlabs/fighub/pull/42',
          },
        },
      }),
    );

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prUrl).toContain('/pull/42');
    }
  });
});
