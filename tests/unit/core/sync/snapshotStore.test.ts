import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import {
  clearSnapshot,
  findOrCreateSnapshotFrame,
  getRegistryFromSnapshot,
  getSnapshot,
  parseSnapshot,
  persistSnapshot,
  upsertSnapshotRegistryEntry,
} from '@/core/sync/snapshotStore';
import { SNAPSHOT_FRAME_NAME, SNAPSHOT_PLUGIN_DATA_KEY } from '@/core/sync/snapshotConstants';

import buttonSpec from '../../../fixtures/component-spec/chip-button-minimal.v1.json';
import {
  asComponentSetNode,
  asPageNode,
  createMockComponentSet,
  createMockPage,
} from '../components/scaffold/__mocks__/figmaScaffold';
import {
  installMockFigmaOutputPage,
  resetMockFigmaOutputPage,
} from '../../io/sinks/__mocks__/figmaOutputPage';

function buildScaffoldResult(componentSet: ReturnType<typeof createMockComponentSet>) {
  Object.defineProperty(componentSet, 'key', { value: 'abc123', configurable: true });
  return {
    componentSet: asComponentSetNode(componentSet),
    variantCount: 1,
    variantByKey: {},
    replacedExisting: false,
    scaffoldId: 'fighub:scaffold:v1:Button:test',
    auditRows: [],
    unresolvedTokens: [],
  };
}

describe('snapshotStore', () => {
  beforeEach(function () {
    resetMockFigmaOutputPage();
    installMockFigmaOutputPage();
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaMock = globalRecord.figma as Record<string, unknown>;
    figmaMock.fileKey = 'mock-file-key';
  });

  it('parseSnapshot returns empty envelope when raw is missing', () => {
    const snapshot = parseSnapshot(null);
    expect(snapshot.v).toBe(1);
    expect(snapshot.kind).toBe('snapshot');
    expect(snapshot.fileKey).toBe('mock-file-key');
    expect(snapshot.registry.components).toEqual({});
    expect(snapshot.keys).toEqual({});
  });

  it('parseSnapshot returns empty envelope on corrupt JSON', () => {
    const snapshot = parseSnapshot('{not-json');
    expect(snapshot.kind).toBe('snapshot');
    expect(snapshot.registry.components).toEqual({});
  });

  it('findOrCreateSnapshotFrame creates hidden locked frame on output page', () => {
    const frame = findOrCreateSnapshotFrame();
    expect(frame.name).toBe(SNAPSHOT_FRAME_NAME);
    expect(frame.visible).toBe(false);
    expect(frame.locked).toBe(true);
    expect(frame.width).toBe(1);
    expect(frame.height).toBe(1);
  });

  it('round-trips snapshot through pluginData', () => {
    const snapshot = getSnapshot();
    snapshot.registry.components = {
      Button: {
        nodeId: 'CS:1',
        key: 'abc123',
        pageName: '↳ Buttons',
        publishedAt: '2026-05-28T00:00:00.000Z',
        version: 1,
      },
    };
    persistSnapshot(snapshot);

    const frame = findOrCreateSnapshotFrame();
    const raw = frame.getPluginData(SNAPSHOT_PLUGIN_DATA_KEY);
    expect(raw.length).toBeGreaterThan(0);
    const roundTrip = parseSnapshot(raw);
    expect(roundTrip.registry.components.Button.version).toBe(1);
  });

  it('getRegistryFromSnapshot maps snapshot registry to RegistryV1', () => {
    persistSnapshot({
      v: 1,
      kind: 'snapshot',
      fileKey: 'mock-file-key',
      updatedAt: '2026-05-28T00:00:00.000Z',
      keys: {},
      registry: {
        components: {
          Button: {
            nodeId: 'CS:1',
            key: 'abc123',
            pageName: '↳ Buttons',
            publishedAt: '2026-05-28T00:00:00.000Z',
            version: 2,
          },
        },
      },
    });

    const registry = getRegistryFromSnapshot();
    expect(registry.v).toBe(1);
    expect(registry.kind).toBe('registry');
    expect(registry.fileKey).toBe('mock-file-key');
    expect(registry.components.Button.version).toBe(2);
  });

  it('reconciles repo registry fileKey with canvas fileKey before merge', () => {
    persistSnapshot({
      v: 1,
      kind: 'snapshot',
      fileKey: '',
      updatedAt: '2026-05-28T00:00:00.000Z',
      keys: {},
      registry: { components: {} },
    });

    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    page.name = '↳ Buttons';
    const spec = buttonSpec as ComponentSpecV1;
    const merged = upsertSnapshotRegistryEntry({
      registry: {
        v: 1,
        kind: 'registry',
        fileKey: 'cVdPraIafWFBRZnzMPhtrW',
        components: {},
      },
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'cVdPraIafWFBRZnzMPhtrW',
      now: new Date('2026-05-28T00:00:00.000Z'),
    });

    expect(merged.fileKey).toBe('cVdPraIafWFBRZnzMPhtrW');
    expect(merged.components.Button.version).toBe(1);
  });

  it('upsertSnapshotRegistryEntry persists merged registry', () => {
    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    page.name = '↳ Buttons';
    const spec = buttonSpec as ComponentSpecV1;
    const merged = upsertSnapshotRegistryEntry({
      registry: null,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: new Date('2026-05-28T00:00:00.000Z'),
    });

    expect(merged.components.Button.version).toBe(1);
    const fromSnapshot = getRegistryFromSnapshot();
    expect(fromSnapshot.components.Button.nodeId).toBe('CS:1');
  });

  it('persistSnapshot throws when payload exceeds size guard', () => {
    const hugeComponents: Record<
      string,
      { nodeId: string; key: string; pageName: string; publishedAt: string; version: number }
    > = {};
    for (let i = 0; i < 1500; i++) {
      hugeComponents['ComponentWithAVeryLongNameForSizeGuardTesting' + String(i)] = {
        nodeId: 'CS:' + String(i),
        key: 'key-with-padding-to-inflate-byte-size-' + String(i),
        pageName: '↳ Buttons and more padding text here',
        publishedAt: '2026-05-28T00:00:00.000Z',
        version: 1,
      };
    }

    expect(function () {
      persistSnapshot({
        v: 1,
        kind: 'snapshot',
        fileKey: 'mock-file-key',
        updatedAt: '2026-05-28T00:00:00.000Z',
        keys: {},
        registry: { components: hugeComponents },
      });
    }).toThrow(/Canvas snapshot exceeds/);
  });

  it('clearSnapshot removes pluginData payload', () => {
    persistSnapshot(getSnapshot());
    clearSnapshot();
    expect(getSnapshot().registry.components).toEqual({});
  });
});
