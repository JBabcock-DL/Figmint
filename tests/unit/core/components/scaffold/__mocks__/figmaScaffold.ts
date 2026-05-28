/// <reference types="@figma/plugin-typings" />

import {
  MockFrame,
  MockTextNode,
  createMockFrame,
  resetMockFigmaFrames,
} from '../../../canvas/__mocks__/figmaFrames';

let nextComponentId = 1;
let nextComponentSetId = 1;
let nextInstanceId = 1;
let loadFontAsyncCalls: FontName[] = [];
let registryNodes: Record<string, MockComponentSet> = {};

export type MockInstance = MockFrame & {
  setProperties(props: Record<string, string | number | boolean>): void;
};
export type MockComponent = MockFrame;
export type MockComponentSet = MockFrame & {
  layoutWrap: 'NO_WRAP' | 'WRAP';
  pluginData: Record<string, string>;
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
  createInstance(): MockInstance;
};
export type MockPage = MockFrame;

function tagNodeType<T extends string>(frame: MockFrame, nodeType: T): MockFrame & { readonly type: T } {
  Object.defineProperty(frame, 'type', { value: nodeType });
  return frame as MockFrame & { readonly type: T };
}

export function createMockComponent(overrides?: Parameters<typeof createMockFrame>[0]): MockComponent {
  const frame = createMockFrame(overrides, false);
  frame.id = 'component-' + String(nextComponentId++);
  return tagNodeType(frame, 'COMPONENT');
}

export function createMockInstance(): MockInstance {
  const frame = createMockFrame(undefined, false);
  frame.id = 'instance-' + String(nextInstanceId++);
  const inst = frame as unknown as MockInstance;
  Object.defineProperty(inst, 'type', { value: 'INSTANCE' });
  inst.setProperties = function setProperties(_props: Record<string, string | number | boolean>): void {
    // Mock — no-op for unit tests.
  };
  return inst;
}

export function createMockComponentSet(overrides?: { id?: string }): MockComponentSet {
  const frame = createMockFrame(undefined, false);
  frame.id = overrides !== undefined && overrides.id !== undefined ? overrides.id : 'component-set-' + String(nextComponentSetId++);
  Object.defineProperty(frame, 'type', { value: 'COMPONENT_SET' });
  const pluginData: Record<string, string> = {};
  const set = frame as unknown as MockComponentSet;
  set.layoutWrap = 'NO_WRAP';
  set.pluginData = pluginData;
  set.getPluginData = function getPluginData(key: string): string {
    if (Object.prototype.hasOwnProperty.call(pluginData, key)) {
      return pluginData[key];
    }
    return '';
  };
  set.setPluginData = function setPluginData(key: string, value: string): void {
    pluginData[key] = value;
  };
  set.createInstance = function createInstance(): MockInstance {
    return createMockInstance();
  };
  return set;
}

export function registerMockRegistryNode(nodeId: string, componentSet: MockComponentSet): void {
  registryNodes[nodeId] = componentSet;
}

export function createMockPage(): MockPage {
  const frame = createMockFrame({ name: 'Page' }, false);
  return tagNodeType(frame, 'PAGE');
}

export function combineAsVariants(
  components: ComponentNode[],
  parent: BaseNode & ChildrenMixin,
): MockComponentSet {
  const set = createMockComponentSet();
  set.layoutMode = 'HORIZONTAL';
  const parentFrame = parent as unknown as MockFrame;
  parentFrame.appendChild(set as unknown as SceneNode);

  for (let i = 0; i < components.length; i++) {
    const component = components[i] as unknown as MockFrame;
    if (component.parent !== null) {
      component.remove();
    }
    set.appendChild(component as unknown as SceneNode);
  }
  return set;
}

export function getLoadFontAsyncCalls(): FontName[] {
  return loadFontAsyncCalls.slice();
}

export function resetMockFigmaScaffold(): void {
  resetMockFigmaFrames();
  nextComponentId = 1;
  nextComponentSetId = 1;
  nextInstanceId = 1;
  loadFontAsyncCalls = [];
  registryNodes = {};
}

export function installMockFigmaScaffold(): void {
  resetMockFigmaScaffold();

  const globalRecord = globalThis as Record<string, unknown>;

  globalRecord.figma = {
    createFrame: () => createMockFrame(undefined, false) as unknown as FrameNode,
    createComponent: () => createMockComponent() as unknown as ComponentNode,
    createText: () => new MockTextNode() as unknown as TextNode,
    combineAsVariants: (components: ComponentNode[], parent: BaseNode & ChildrenMixin) =>
      combineAsVariants(components, parent) as unknown as ComponentSetNode,
    loadFontAsync: async (font: FontName) => {
      loadFontAsyncCalls.push(font);
    },
    getNodeById: (id: string) => {
      if (Object.prototype.hasOwnProperty.call(registryNodes, id)) {
        return registryNodes[id] as unknown as BaseNode;
      }
      return null;
    },
    variables: {
      setBoundVariableForPaint: (paint: SolidPaint) => paint,
    },
  };
}

export function asComponentNode(mock: MockComponent): ComponentNode {
  return mock as unknown as ComponentNode;
}

export function asComponentSetNode(mock: MockComponentSet): ComponentSetNode {
  return mock as unknown as ComponentSetNode;
}

export function asPageNode(mock: MockPage): PageNode {
  return mock as unknown as PageNode;
}

export { MockTextNode, createMockFrame };
