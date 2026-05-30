import { describe, expect, it } from 'vitest';

import { buildFigmaNodeUrl } from '@/core/codeconnect/buildFigmaNodeUrl';

describe('buildFigmaNodeUrl', () => {
  it('encodes node id colons as hyphens in query', () => {
    const url = buildFigmaNodeUrl({
      fileKey: 'abc123',
      fileSlug: 'Design System',
      nodeId: '1:2',
    });
    expect(url).toBe(
      'https://www.figma.com/design/abc123/Design%20System?node-id=1-2',
    );
  });
});
