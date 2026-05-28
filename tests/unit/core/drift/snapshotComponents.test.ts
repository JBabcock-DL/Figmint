import { beforeEach, describe, expect, it } from 'vitest';

import { readSnapshotComponentComparables } from '@/core/drift/snapshotComponents';
import { persistSnapshot } from '@/core/sync/snapshotStore';

import {
  installMockFigmaOutputPage,
  resetMockFigmaOutputPage,
} from '../../io/sinks/__mocks__/figmaOutputPage';

describe('readSnapshotComponentComparables', () => {
  beforeEach(function () {
    resetMockFigmaOutputPage();
    installMockFigmaOutputPage();
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaMock = globalRecord.figma as Record<string, unknown>;
    figmaMock.fileKey = 'mock-file-key';
  });

  it('reads cmp/ blobs and falls back to registry cvaHash', () => {
    persistSnapshot({
      v: 1,
      kind: 'snapshot',
      fileKey: 'mock-file-key',
      updatedAt: '2026-05-28T00:00:00.000Z',
      keys: {
        'cmp/Button': {
          key: 'cmp/Button',
          value: {
            specName: 'Button',
            variantMatrixHash: 'abc123',
            props: [],
            bindings: [],
          },
          source: 'push',
          timestamp: '2026-05-28T00:00:00.000Z',
        },
      },
      registry: {
        components: {
          Chip: {
            nodeId: 'CS:2',
            key: 'chip-key',
            pageName: '↳ Chips',
            publishedAt: '2026-05-28T00:00:00.000Z',
            version: 1,
            cvaHash: 'deadbeef',
          },
        },
      },
    });

    const comparables = readSnapshotComponentComparables();
    expect(comparables.Button.variantMatrixHash).toBe('abc123');
    expect(comparables.Chip.variantMatrixHash).toBe('deadbeef');
    expect(comparables.Chip.nodeId).toBe('CS:2');
  });
});
