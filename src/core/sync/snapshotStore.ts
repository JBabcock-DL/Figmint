/// <reference types="@figma/plugin-typings" />

import type { RegistryV1, SnapshotV1 } from '@detroitlabs/fighub-contracts';

import { upsertRegistryEntry } from '@/core/components/registry';
import type { UpsertRegistryEntryInput } from '@/core/components/registry.types';
import { pluginLog } from '@/core/pluginLog';
import { utf8ByteLength } from '@/core/text/utf8ByteLength';
import { findOrCreateOutputPage } from '@/io/sinks/outputPage';

import {
  LEGACY_SNAPSHOT_FRAME_NAMES,
  LEGACY_SNAPSHOT_PLUGIN_DATA_KEY,
  SNAPSHOT_FRAME_NAME,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_PLUGIN_DATA_KEY,
} from './snapshotConstants';

function readFileKey(): string {
  if (figma.fileKey !== undefined && figma.fileKey.length > 0) {
    return figma.fileKey;
  }
  return '';
}

function createEmptySnapshot(fileKey?: string): SnapshotV1 {
  const resolvedFileKey = fileKey !== undefined && fileKey.length > 0 ? fileKey : readFileKey();
  return {
    v: 1,
    kind: 'snapshot',
    fileKey: resolvedFileKey,
    updatedAt: new Date().toISOString(),
    keys: {},
    registry: { components: {} },
  };
}

function isSnapshotFrame(name: string): boolean {
  if (name === SNAPSHOT_FRAME_NAME) {
    return true;
  }
  for (let i = 0; i < LEGACY_SNAPSHOT_FRAME_NAMES.length; i++) {
    if (name === LEGACY_SNAPSHOT_FRAME_NAMES[i]) {
      return true;
    }
  }
  return false;
}

export function findOrCreateSnapshotFrame(): FrameNode {
  const page = findOrCreateOutputPage();
  for (let i = 0; i < page.children.length; i++) {
    const child = page.children[i];
    if (child.type === 'FRAME' && isSnapshotFrame(child.name)) {
      return child;
    }
  }

  const frame = figma.createFrame();
  frame.name = SNAPSHOT_FRAME_NAME;
  frame.resize(1, 1);
  frame.visible = false;
  frame.locked = true;
  page.insertChild(0, frame);
  return frame;
}

export function readSnapshotRaw(): string | null {
  const frame = findOrCreateSnapshotFrame();
  const raw = frame.getPluginData(SNAPSHOT_PLUGIN_DATA_KEY);
  if (raw.length > 0) {
    return raw;
  }
  const legacy = frame.getPluginData(LEGACY_SNAPSHOT_PLUGIN_DATA_KEY);
  return legacy.length > 0 ? legacy : null;
}

export function parseSnapshot(raw: string | null): SnapshotV1 {
  if (raw === null || raw.length === 0) {
    return createEmptySnapshot();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      pluginLog('[snapshot] parse failed — invalid envelope');
      return createEmptySnapshot();
    }
    const record = parsed as Record<string, unknown>;
    if (record.v !== 1 || record.kind !== 'snapshot') {
      pluginLog('[snapshot] parse failed — wrong envelope');
      return createEmptySnapshot();
    }
    const fileKey = typeof record.fileKey === 'string' ? record.fileKey : readFileKey();
    const updatedAt =
      typeof record.updatedAt === 'string' && record.updatedAt.length > 0
        ? record.updatedAt
        : new Date().toISOString();
    const keys =
      typeof record.keys === 'object' && record.keys !== null && !Array.isArray(record.keys)
        ? (record.keys as SnapshotV1['keys'])
        : {};
    let components: SnapshotV1['registry']['components'] = {};
    if (
      typeof record.registry === 'object' &&
      record.registry !== null &&
      !Array.isArray(record.registry)
    ) {
      const registryRecord = record.registry as Record<string, unknown>;
      if (
        typeof registryRecord.components === 'object' &&
        registryRecord.components !== null &&
        !Array.isArray(registryRecord.components)
      ) {
        components = registryRecord.components as SnapshotV1['registry']['components'];
      }
    }
    return {
      v: 1,
      kind: 'snapshot',
      fileKey: fileKey,
      updatedAt: updatedAt,
      keys: keys,
      registry: { components: components },
    };
  } catch {
    pluginLog('[snapshot] parse failed — corrupt JSON');
    return createEmptySnapshot();
  }
}

export function getSnapshot(): SnapshotV1 {
  return parseSnapshot(readSnapshotRaw());
}

export function persistSnapshot(snapshot: SnapshotV1): void {
  const serialized = JSON.stringify(snapshot);
  const byteLength = utf8ByteLength(serialized);
  if (byteLength > SNAPSHOT_MAX_BYTES) {
    throw new Error(
      'Canvas snapshot exceeds ' +
        String(SNAPSHOT_MAX_BYTES) +
        ' bytes (' +
        String(byteLength) +
        '). Trim registry entries or drift keys before saving.',
    );
  }
  const frame = findOrCreateSnapshotFrame();
  frame.setPluginData(SNAPSHOT_PLUGIN_DATA_KEY, serialized);
  pluginLog('[snapshot] persist', String(byteLength) + ' bytes');
}

export function getRegistryFromSnapshot(): RegistryV1 {
  const snapshot = getSnapshot();
  const canvasFileKey = readFileKey();
  const fileKey =
    canvasFileKey.length > 0
      ? canvasFileKey
      : snapshot.fileKey.length > 0
        ? snapshot.fileKey
        : '';
  return {
    v: 1,
    kind: 'registry',
    fileKey: fileKey,
    components: snapshot.registry.components,
  };
}

function reconcileRegistryToCanvasFileKey(
  registry: RegistryV1,
  canvasFileKey: string,
): RegistryV1 {
  if (canvasFileKey.length === 0 || registry.fileKey === canvasFileKey) {
    return registry;
  }
  return {
    v: registry.v,
    kind: registry.kind,
    fileKey: canvasFileKey,
    components: registry.components,
  };
}

export function upsertSnapshotRegistryEntry(input: UpsertRegistryEntryInput): RegistryV1 {
  const snapshot = getSnapshot();
  const canvasFileKey =
    input.fileKey.length > 0 ? input.fileKey : snapshot.fileKey.length > 0 ? snapshot.fileKey : readFileKey();
  const baseRegistry = reconcileRegistryToCanvasFileKey(
    input.registry !== null ? input.registry : getRegistryFromSnapshot(),
    canvasFileKey,
  );
  const merged = upsertRegistryEntry({
    registry: baseRegistry,
    spec: input.spec,
    scaffold: input.scaffold,
    targetPage: input.targetPage,
    fileKey: canvasFileKey,
    now: input.now,
  });
  const fileKey = canvasFileKey.length > 0 ? canvasFileKey : snapshot.fileKey;
  const nextSnapshot: SnapshotV1 = {
    v: 1,
    kind: 'snapshot',
    fileKey: fileKey,
    updatedAt: new Date().toISOString(),
    keys: snapshot.keys,
    registry: {
      components: merged.components,
    },
  };
  persistSnapshot(nextSnapshot);
  const entry = merged.components[input.spec.name];
  pluginLog(
    '[snapshot] upsert registry',
    input.spec.name,
    entry !== undefined ? String(entry.version) : '0',
  );
  return merged;
}

export function updateSnapshotKeys(
  keys: { key: string; value: unknown; source: 'push' | 'pull' }[],
): void {
  const snapshot = getSnapshot();
  const nextKeys = Object.assign({}, snapshot.keys);
  const timestamp = new Date().toISOString();
  for (let i = 0; i < keys.length; i++) {
    const item = keys[i];
    nextKeys[item.key] = {
      key: item.key,
      value: item.value,
      source: item.source,
      timestamp: timestamp,
    };
  }
  persistSnapshot({
    v: 1,
    kind: 'snapshot',
    fileKey: snapshot.fileKey,
    updatedAt: timestamp,
    keys: nextKeys,
    registry: snapshot.registry,
  });
}

export function clearSnapshot(): void {
  const frame = findOrCreateSnapshotFrame();
  frame.setPluginData(SNAPSHOT_PLUGIN_DATA_KEY, '');
  pluginLog('[snapshot] cleared');
}

/** Drops variable drift keys only; keeps component registry entries. */
export function clearVariableSnapshotKeys(): void {
  const snapshot = getSnapshot();
  const nextKeys: Record<string, SnapshotV1['keys'][string]> = {};
  for (const entryKey of Object.keys(snapshot.keys)) {
    if (!entryKey.startsWith('var/')) {
      nextKeys[entryKey] = snapshot.keys[entryKey];
    }
  }
  persistSnapshot({
    v: 1,
    kind: 'snapshot',
    fileKey: snapshot.fileKey,
    updatedAt: new Date().toISOString(),
    keys: nextKeys,
    registry: snapshot.registry,
  });
  pluginLog('[snapshot] cleared variable keys');
}
