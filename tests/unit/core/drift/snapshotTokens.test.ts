import { beforeEach, describe, expect, it } from 'vitest';

import { readVariableSnapshotTokens } from '@/core/drift/snapshotTokens';
import { persistSnapshot } from '@/core/sync/snapshotStore';

import {
  installMockFigmaOutputPage,
  resetMockFigmaOutputPage,
} from '../../io/sinks/__mocks__/figmaOutputPage';

describe('readVariableSnapshotTokens', () => {
  beforeEach(function () {
    resetMockFigmaOutputPage();
    installMockFigmaOutputPage();
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaMock = globalRecord.figma as Record<string, unknown>;
    figmaMock.fileKey = 'mock-file-key';
  });

  it('reads var/ keys from snapshot pluginData', () => {
    persistSnapshot({
      v: 1,
      kind: 'snapshot',
      fileKey: 'mock-file-key',
      updatedAt: '2026-05-28T00:00:00.000Z',
      keys: {
        'var/Primitives/a': {
          key: 'var/Primitives/a',
          value: {
            resolvedType: 'FLOAT',
            valuesByMode: { Default: 0 },
            codeSyntax: {},
          },
          source: 'push',
          timestamp: '2026-05-28T00:00:00.000Z',
        },
        'cmp/Button': {
          key: 'cmp/Button',
          value: { nodeId: '1' },
          source: 'pull',
          timestamp: '2026-05-28T00:00:00.000Z',
        },
        'var/bad': {
          key: 'var/bad',
          value: 'not-comparable',
          source: 'push',
          timestamp: '2026-05-28T00:00:00.000Z',
        },
      },
      registry: { components: {} },
    });

    const tokens = readVariableSnapshotTokens();
    expect(tokens['Primitives/a']).toEqual({
      resolvedType: 'FLOAT',
      valuesByMode: { Default: 0 },
      codeSyntax: {},
    });
    expect(tokens['cmp/Button']).toBeUndefined();
  });
});
