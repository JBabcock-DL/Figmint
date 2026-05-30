import { describe, expect, it } from 'vitest';

import {
  CODECONNECT_DETECT,
  CODECONNECT_DETECT_RESULT,
  CODECONNECT_EMIT_PR,
  CODECONNECT_EMIT_PR_UI_RESULT,
  isCodeConnectDetectMessage,
  isCodeConnectDetectResultMessage,
  isCodeConnectEmitPRRequest,
  isCodeConnectEmitPrMessage,
  isCodeConnectEmitPrResultMessage,
} from '@/io/messages/codeconnect';

describe('codeconnect messages', () => {
  it('accepts valid detect message', () => {
    expect(
      isCodeConnectDetectMessage({
        type: CODECONNECT_DETECT,
        requestId: 'd-1',
        repoUrl: 'https://github.com/acme/widgets',
        nodeIds: ['1:2'],
      }),
    ).toBe(true);
  });

  it('accepts valid UI emit-pr message', () => {
    expect(
      isCodeConnectEmitPrMessage({
        type: CODECONNECT_EMIT_PR,
        requestId: 'e-1',
        repoUrl: 'https://github.com/acme/widgets',
        componentIds: ['1:2', '3:4'],
      }),
    ).toBe(true);
  });

  it('accepts detect and emit result messages', () => {
    expect(
      isCodeConnectDetectResultMessage({
        type: CODECONNECT_DETECT_RESULT,
        requestId: 'd-1',
        ok: true,
        unmapped: [],
      }),
    ).toBe(true);
    expect(
      isCodeConnectEmitPrResultMessage({
        type: CODECONNECT_EMIT_PR_UI_RESULT,
        requestId: 'e-1',
        ok: true,
        prUrl: 'https://github.com/o/r/pull/42',
      }),
    ).toBe(true);
  });

  it('rejects UI emit-pr without componentIds', () => {
    expect(
      isCodeConnectEmitPrMessage({
        type: CODECONNECT_EMIT_PR,
        requestId: 'e-1',
        repoUrl: 'https://github.com/acme/widgets',
      }),
    ).toBe(false);
  });

  it('accepts valid legacy emit-pr request', () => {
    expect(
      isCodeConnectEmitPRRequest({
        type: CODECONNECT_EMIT_PR,
        repoUrl: 'https://github.com/acme/widgets',
        specsPath: 'design/components',
        owner: 'acme',
        repo: 'widgets',
        defaultBranch: 'main',
        framework: 'react',
        selectedNodeIds: ['1:2'],
      }),
    ).toBe(true);
  });

  it('rejects invalid framework', () => {
    expect(
      isCodeConnectEmitPRRequest({
        type: CODECONNECT_EMIT_PR,
        repoUrl: 'https://github.com/acme/widgets',
        specsPath: 'design/components',
        owner: 'acme',
        repo: 'widgets',
        defaultBranch: 'main',
        framework: 'vue',
      }),
    ).toBe(false);
  });

  it('rejects missing repoUrl', () => {
    expect(
      isCodeConnectEmitPRRequest({
        type: CODECONNECT_EMIT_PR,
        specsPath: 'design/components',
        owner: 'acme',
        repo: 'widgets',
        defaultBranch: 'main',
        framework: 'react',
      }),
    ).toBe(false);
  });
});
