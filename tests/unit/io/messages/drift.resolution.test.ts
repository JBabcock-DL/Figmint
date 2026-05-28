import { describe, expect, it } from 'vitest';

import {
  isDriftDetectQuickMessage,
  isOpsDetectDriftMessage,
  isResolutionBulkPullMessage,
  isResolutionBulkPushMessage,
} from '@/io/messages/drift';

import tokensPayload from '../../../fixtures/ui/export/tokens.json';
import driftPayload from '../../../fixtures/ui/export/drift-report.json';

describe('drift resolution messages', () => {
  it('accepts detect-quick message', () => {
    expect(
      isDriftDetectQuickMessage({
        type: 'drift/detect-quick',
        requestId: 'req-1',
        repoUrl: 'https://github.com/detroitlabs/fighub',
        repoTokens: tokensPayload,
        repoSpecs: [],
      }),
    ).toBe(true);
  });

  it('accepts ops detect-drift message', () => {
    expect(
      isOpsDetectDriftMessage({
        type: 'ops/detect-drift',
        requestId: 'req-1',
        repoUrl: 'https://github.com/detroitlabs/fighub',
        repoTokens: tokensPayload,
        repoSpecs: [],
        scope: ['variables', 'components'],
      }),
    ).toBe(true);
  });

  it('accepts bulk resolution messages', () => {
    expect(
      isResolutionBulkPushMessage({
        type: 'resolution/bulk-push',
        requestId: 'req-1',
        repoUrl: 'https://github.com/detroitlabs/fighub',
        report: driftPayload,
        resolutions: {},
        driftIds: ['var/a'],
        repoTokens: tokensPayload,
      }),
    ).toBe(true);
    expect(
      isResolutionBulkPullMessage({
        type: 'resolution/bulk-pull',
        requestId: 'req-1',
        report: driftPayload,
        resolutions: {},
        driftIds: ['var/a'],
      }),
    ).toBe(true);
  });
});
