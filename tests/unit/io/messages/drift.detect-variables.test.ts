import { describe, expect, it } from 'vitest';

import {
  isDriftDetectVariablesMessage,
  isDriftDetectVariablesResultMessage,
} from '@/io/messages/drift';

import tokensMinimal from '../../../fixtures/audit/tokens-minimal.v1.json';

describe('drift/detect-variables messages', () => {
  it('accepts valid detect message', () => {
    expect(
      isDriftDetectVariablesMessage({
        type: 'drift/detect-variables',
        requestId: 'req-1',
        repoTokens: tokensMinimal,
      }),
    ).toBe(true);
  });

  it('rejects message without TokensV1 envelope', () => {
    expect(
      isDriftDetectVariablesMessage({
        type: 'drift/detect-variables',
        requestId: 'req-1',
        repoTokens: { tokens: [] },
      }),
    ).toBe(false);
  });

  it('accepts result message shape', () => {
    expect(
      isDriftDetectVariablesResultMessage({
        type: 'drift/detect-variables/result',
        requestId: 'req-1',
        ok: true,
        result: { drifts: [], syncedCount: 0 },
      }),
    ).toBe(true);
  });
});
