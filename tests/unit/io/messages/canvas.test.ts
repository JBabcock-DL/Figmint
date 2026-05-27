import { describe, expect, it } from 'vitest';

import foundationsMinimal from '@/core/canvas/__fixtures__/foundations-minimal.v1.json';
import {
  isCanvasBuildPageMessage,
  isCanvasBuildErrorMessage,
  isCanvasBuildResultMessage,
} from '@/io/messages/canvas';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

describe('canvas messages', () => {
  it('isCanvasBuildPageMessage accepts valid primitives build', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'primitives',
        tokens: foundationsMinimal as unknown as TokensV1,
      }),
    ).toBe(true);
  });

  it('isCanvasBuildPageMessage accepts text-styles build', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'text-styles',
        tokens: foundationsMinimal as unknown as TokensV1,
      }),
    ).toBe(true);
  });

  it('isCanvasBuildPageMessage accepts token-overview build', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'token-overview',
        tokens: foundationsMinimal as unknown as TokensV1,
      }),
    ).toBe(true);
  });

  it('isCanvasBuildPageMessage accepts layout build', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'layout',
        tokens: foundationsMinimal as unknown as TokensV1,
      }),
    ).toBe(true);
  });

  it('isCanvasBuildPageMessage accepts effects build', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'effects',
        tokens: foundationsMinimal as unknown as TokensV1,
      }),
    ).toBe(true);
  });

  it('rejects invalid page slug', () => {
    expect(
      isCanvasBuildPageMessage({
        type: 'canvas/build-page',
        page: 'bootstrap',
        tokens: foundationsMinimal,
      }),
    ).toBe(false);
  });

  it('isCanvasBuildResultMessage validates result shape', () => {
    expect(
      isCanvasBuildResultMessage({
        type: 'canvas/result',
        result: {
          ok: true,
          builder: 'theme',
          durationMs: 42,
          pageId: '1:1',
          pageName: '↳ Theme',
          tableCount: 3,
          swatchCount: 24,
          warnings: [],
        },
      }),
    ).toBe(true);
  });

  it('isCanvasBuildErrorMessage validates error shape', () => {
    expect(
      isCanvasBuildErrorMessage({
        type: 'canvas/error',
        message: 'page not found',
      }),
    ).toBe(true);
  });
});
