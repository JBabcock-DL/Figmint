import { describe, expect, it } from 'vitest';

import { isDriftBuildReportMessage, isDriftBuildReportResultMessage } from '@/io/messages/drift';

import tokensPayload from '../../../fixtures/ui/export/tokens.json';
import componentSpecPayload from '../../../fixtures/ui/export/component-spec.json';

describe('drift/build-report messages', () => {
  it('accepts valid build-report message', () => {
    expect(
      isDriftBuildReportMessage({
        type: 'drift/build-report',
        requestId: 'req-1',
        repoUrl: 'https://github.com/detroitlabs/fighub',
        repoTokens: tokensPayload,
        repoSpecs: [{ name: 'Button', spec: componentSpecPayload }],
      }),
    ).toBe(true);
  });

  it('accepts build-report result message', () => {
    expect(
      isDriftBuildReportResultMessage({
        type: 'drift/build-report/result',
        requestId: 'req-1',
        ok: true,
      }),
    ).toBe(true);
  });
});
