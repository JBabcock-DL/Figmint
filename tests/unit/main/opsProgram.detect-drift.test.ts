import { describe, expect, it } from 'vitest';

import { isOpsDetectDriftMessage } from '@/io/messages/drift';

import tokensPayload from '../../fixtures/ui/export/tokens.json';

describe('ops/detect-drift message', () => {
  it('matches ops program detect-drift op payload shape', () => {
    expect(
      isOpsDetectDriftMessage({
        type: 'ops/detect-drift',
        requestId: 'ops-1',
        repoUrl: 'https://github.com/detroitlabs/fighub',
        repoTokens: tokensPayload,
        repoSpecs: [],
        scope: ['variables', 'components'],
      }),
    ).toBe(true);
  });
});
