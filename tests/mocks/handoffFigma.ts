/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { vi } from 'vitest';

const FIXTURE_BASE64 = readFileSync(
  resolve(__dirname, '../fixtures/handoff/1x1.png.base64.txt'),
  'utf8',
).trim();

export function decodeFixturePng(): Uint8Array {
  const binary = atob(FIXTURE_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface MockExportableNodeOptions {
  id?: string;
  name?: string;
  type?: SceneNode['type'];
  exportBytes?: Uint8Array;
  exportDelayMs?: number;
  exportError?: Error;
}

export function createMockExportableNode(options?: MockExportableNodeOptions): SceneNode {
  const id = options?.id !== undefined ? options.id : '1:2';
  const name = options?.name !== undefined ? options.name : 'Frame';
  const type = options?.type !== undefined ? options.type : 'FRAME';
  const exportBytes =
    options?.exportBytes !== undefined ? options.exportBytes : decodeFixturePng();
  const exportDelayMs = options?.exportDelayMs !== undefined ? options.exportDelayMs : 0;
  const exportError = options?.exportError;

  return {
    id: id,
    name: name,
    type: type,
    exportAsync: vi.fn(function () {
      if (exportError !== undefined) {
        return Promise.reject(exportError);
      }
      if (exportDelayMs > 0) {
        return new Promise(function (resolvePromise) {
          setTimeout(function () {
            resolvePromise(exportBytes);
          }, exportDelayMs);
        });
      }
      return Promise.resolve(exportBytes);
    }),
  } as unknown as SceneNode;
}

export interface HandoffFigmaMockOptions {
  selection: SceneNode[];
  fileKey?: string | undefined;
  fileName?: string;
  manualFileKey?: string;
}

let previousFigma: unknown;
let variableRegistry = new Map<string, { id: string; name: string; collectionName: string }>();
let collectionRegistry = new Map<string, { id: string; name: string }>();
let rootPluginData = new Map<string, string>();

export function setManualFileKeyOverrideForTests(fileKey: string): void {
  rootPluginData.set('fighub.figmaFileKey', fileKey);
}

export function clearManualFileKeyOverrideForTests(): void {
  rootPluginData.delete('fighub.figmaFileKey');
}

export interface MockVariableEntry {
  id: string;
  name: string;
  collectionName: string;
}

export function installVariableRegistry(variables: MockVariableEntry[]): void {
  variableRegistry = new Map();
  collectionRegistry = new Map();

  for (let i = 0; i < variables.length; i++) {
    const entry = variables[i];
    variableRegistry.set(entry.id, entry);
    if (!collectionRegistry.has(entry.collectionName)) {
      collectionRegistry.set(entry.collectionName, {
        id: 'collection:' + entry.collectionName,
        name: entry.collectionName,
      });
    }
  }

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaRecord = globalRecord.figma as Record<string, unknown> | undefined;
  if (figmaRecord === undefined) {
    globalRecord.figma = { variables: createVariableApiStub() };
    return;
  }
  figmaRecord.variables = createVariableApiStub();
}

function createVariableApiStub(): {
  getVariableByIdAsync: ReturnType<typeof vi.fn>;
  getVariableCollectionByIdAsync: ReturnType<typeof vi.fn>;
} {
  return {
    getVariableByIdAsync: vi.fn(async function (id: string) {
      const entry = variableRegistry.get(id);
      if (entry === undefined) {
        return null;
      }
      const collection = collectionRegistry.get(entry.collectionName);
      if (collection === undefined) {
        return null;
      }
      return {
        id: entry.id,
        name: entry.name,
        variableCollectionId: collection.id,
      };
    }),
    getVariableCollectionByIdAsync: vi.fn(async function (id: string) {
      for (const collection of collectionRegistry.values()) {
        if (collection.id === id) {
          return { id: collection.id, name: collection.name };
        }
      }
      return null;
    }),
  };
}

export function resetVariableRegistry(): void {
  variableRegistry = new Map();
  collectionRegistry = new Map();
}

export function installHandoffFigmaMock(options: HandoffFigmaMockOptions): void {
  const globalRecord = globalThis as Record<string, unknown>;
  previousFigma = globalRecord.figma;

  const fileKey = 'fileKey' in options ? options.fileKey : 'abc123';
  const fileName = options.fileName !== undefined ? options.fileName : 'My Design File';

  if (options.manualFileKey !== undefined) {
    rootPluginData.set('fighub.figmaFileKey', options.manualFileKey);
  }

  const page = {
    selection: options.selection,
  };

  const root = {
    name: fileName,
    getPluginData: function (key: string): string {
      return rootPluginData.get(key) ?? '';
    },
    setPluginData: function (key: string, value: string): void {
      if (value.length === 0) {
        rootPluginData.delete(key);
      } else {
        rootPluginData.set(key, value);
      }
    },
  };

  globalRecord.figma = {
    fileKey: fileKey,
    root: root,
    currentPage: page,
  };
}

export function restoreHandoffFigmaMock(): void {
  const globalRecord = globalThis as Record<string, unknown>;
  if (previousFigma === undefined) {
    delete globalRecord.figma;
  } else {
    globalRecord.figma = previousFigma;
  }
  previousFigma = undefined;
  rootPluginData = new Map();
  resetVariableRegistry();
}

export function createMockContainer(options: {
  id: string;
  name: string;
  type?: SceneNode['type'];
  children?: SceneNode[];
}): SceneNode {
  const children = options.children !== undefined ? options.children : [];
  const node = {
    id: options.id,
    name: options.name,
    type: options.type !== undefined ? options.type : 'FRAME',
    children: children,
    parent: null,
  };

  for (let i = 0; i < children.length; i++) {
    (children[i] as { parent?: BaseNode | null }).parent = node as BaseNode;
  }

  return node as unknown as SceneNode;
}

export function createMockComponent(options: {
  id: string;
  name: string;
  parent?: BaseNode | null;
}): ComponentNode {
  return {
    id: options.id,
    name: options.name,
    type: 'COMPONENT',
    parent: options.parent !== undefined ? options.parent : null,
  } as unknown as ComponentNode;
}

export function createMockComponentSet(name: string, variants: ComponentNode[]): ComponentSetNode {
  const set = {
    id: 'component-set-' + name,
    name: name,
    type: 'COMPONENT_SET',
    parent: null,
    children: variants,
  } as unknown as ComponentSetNode;

  for (let i = 0; i < variants.length; i++) {
    (variants[i] as { parent?: BaseNode | null }).parent = set;
  }

  return set;
}

export function createMockInstance(options: {
  id: string;
  mainComponent: ComponentNode | null;
  name?: string;
  detached?: boolean;
  getMainComponentAsync?: () => Promise<ComponentNode | null>;
}): InstanceNode {
  const mainComponent = options.mainComponent;
  return {
    id: options.id,
    name: options.name !== undefined ? options.name : 'Instance',
    type: 'INSTANCE',
    detached: options.detached === true,
    mainComponent: mainComponent,
    getMainComponentAsync:
      options.getMainComponentAsync !== undefined
        ? options.getMainComponentAsync
        : vi.fn(function () {
            return Promise.resolve(mainComponent);
          }),
  } as unknown as InstanceNode;
}

export function stubDevResources(component: ComponentNode, urls: string[]): void {
  const resources = urls.map(function (url, index) {
    return { id: 'dev-' + String(index), name: 'Code Connect', url: url };
  });
  (component as { getDevResourcesAsync: () => Promise<unknown[]> }).getDevResourcesAsync = vi.fn(
    function () {
      return Promise.resolve(resources);
    },
  );
}
