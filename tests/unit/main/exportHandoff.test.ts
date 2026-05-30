import { describe, expect, it } from 'vitest';

import { prepareSinkContent } from '@/io/sinks/prepareContent';
import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

describe('export handoff-context via prepareSinkContent', () => {
  it('renders markdown and json for handoff-context documents', function () {
    const loaded = {
      kind: 'handoff-context' as const,
      payload: handoffFixture as HandoffContextV1,
      sourceMeta: {
        port: 'paste' as const,
        receivedAt: '2026-05-29T12:00:00.000Z',
        charLength: 0,
      },
      rawSnippet: '',
    };

    const prepared = prepareSinkContent(loaded, { format: 'both', primaryFormat: 'md' });

    expect(prepared.markdown).toContain('# handoff-context v1');
    expect(prepared.markdown).toContain('## Components used');
    expect(prepared.json).toContain('"kind": "handoff-context"');
    expect(prepared.json).toContain('"Button"');
  });
});
