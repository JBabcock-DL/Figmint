import { describe, expect, it } from 'vitest';

import { detectUnmapped } from '@/core/codeconnect/detectUnmapped';
import type { UnmappedComponentRef } from '@/core/codeconnect/types';
import { mockButtonComponentRef } from '../../../mocks/codeconnectFigma';
import {
  MOCK_REPO_TREE_EMPTY,
  MOCK_REPO_TREE_WITH_BUTTON_STUB,
} from '../../../mocks/codeconnectGithubTree';

function makeComponent(key: string, name: string): UnmappedComponentRef {
  return mockButtonComponentRef({
    componentKey: key,
    name: name,
    nodeId: key + ':1',
  });
}

describe('detectUnmapped', () => {
  const baseCtx = {
    repoUrl: 'https://github.com/acme/widgets',
    specsPath: 'design/components',
    figmaFileKey: 'abc123',
    framework: 'react' as const,
  };

  it('skips mapped button when repo has matching stub path', async function () {
    const result = await detectUnmapped(baseCtx, {
      listRepoPaths: async function () {
        return MOCK_REPO_TREE_WITH_BUTTON_STUB;
      },
      listFigmaComponents: async function () {
        return [mockButtonComponentRef()];
      },
    });

    expect(result.unmapped).toHaveLength(0);
    expect(result.skippedMapped).toBe(1);
  });

  it('returns five unmapped when repo tree is empty', async function () {
    const components = [
      makeComponent('alpha', 'Alpha'),
      makeComponent('beta', 'Beta'),
      makeComponent('gamma', 'Gamma'),
      makeComponent('delta', 'Delta'),
      makeComponent('epsilon', 'Epsilon'),
    ];

    const result = await detectUnmapped(baseCtx, {
      listRepoPaths: async function () {
        return MOCK_REPO_TREE_EMPTY;
      },
      listFigmaComponents: async function () {
        return components;
      },
    });

    expect(result.unmapped).toHaveLength(5);
    expect(result.skippedMapped).toBe(0);
  });

  it('respects selection mode with one mapped candidate', async function () {
    const mapped = mockButtonComponentRef({ nodeId: '10:1' });
    const unmapped = mockButtonComponentRef({
      componentKey: 'card',
      name: 'Card',
      nodeId: '11:1',
    });

    const result = await detectUnmapped(
      { ...baseCtx, selectedNodeIds: ['10:1', '11:1'] },
      {
        listRepoPaths: async function () {
          return MOCK_REPO_TREE_WITH_BUTTON_STUB;
        },
        listFigmaComponents: async function () {
          return [mapped, unmapped];
        },
      },
    );

    expect(result.unmapped).toHaveLength(1);
    expect(result.unmapped[0].name).toBe('Card');
    expect(result.skippedMapped).toBe(1);
  });

  it('marks all figma candidates unmapped when repo tree is empty', async function () {
    const result = await detectUnmapped(baseCtx, {
      listRepoPaths: async function () {
        return MOCK_REPO_TREE_EMPTY;
      },
      listFigmaComponents: async function () {
        return [mockButtonComponentRef()];
      },
    });

    expect(result.unmapped).toHaveLength(1);
    expect(result.skippedMapped).toBe(0);
  });
});
