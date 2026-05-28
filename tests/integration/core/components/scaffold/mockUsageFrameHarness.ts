/// <reference types="@figma/plugin-typings" />

import {
  MockFrame,
  MockTextNode,
  createMockFrame,
  resetMockFigmaFrames,
} from '../../../../unit/core/canvas/__mocks__/figmaFrames';

let nextComponentId = 1;
let nextComponentSetId = 1;
let nextInstanceId = 1;
let loadFontAsyncCalls: FontName[] = [];
let createInstanceCalls = 0;
let setPropertiesCalls: Array<Record<string, string | number | boolean>> = [];

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
  inst.setProperties = function setProperties(props: Record<string, string | number | boolean>): void {
    setPropertiesCalls.push(Object.assign({}, props));
  };
  return inst;
}

function attachCreateInstanceToComponent(component: MockComponent): void {
  const comp = component as MockComponent & { createInstance: () => MockInstance };
  comp.createInstance = function createInstance(): MockInstance {
    createInstanceCalls += 1;
    return createMockInstance();
  };
}

export function createMockComponentSet(overrides?: {
  id?: string;
  variantNames?: string[];
}): MockComponentSet {
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
    createInstanceCalls += 1;
    return createMockInstance();
  };

  const names =
    overrides !== undefined && overrides.variantNames !== undefined
      ? overrides.variantNames
      : ['variant=default'];
  for (let i = 0; i < names.length; i++) {
    const variant = createMockComponent({ name: names[i] });
    attachCreateInstanceToComponent(variant);
    set.appendChild(variant as unknown as SceneNode);
  }

  return set;
}

export function createMockPage(): MockPage {
  const frame = createMockFrame({ name: 'Page' }, false);
  return tagNodeType(frame, 'PAGE');
}

export function getCreateInstanceCallCount(): number {
  return createInstanceCalls;
}

export function getSetPropertiesCalls(): Array<Record<string, string | number | boolean>> {
  return setPropertiesCalls.slice();
}

export function resetUsageFrameHarnessMetrics(): void {
  createInstanceCalls = 0;
  setPropertiesCalls = [];
}

export function installMockUsageFrameHarness(): void {
  resetMockFigmaFrames();
  nextComponentId = 1;
  nextComponentSetId = 1;
  nextInstanceId = 1;
  loadFontAsyncCalls = [];
  resetUsageFrameHarnessMetrics();

  const globalRecord = globalThis as Record<string, unknown>;

  globalRecord.figma = {
    createFrame: () => createMockFrame(undefined, false) as unknown as FrameNode,
    createComponent: () => createMockComponent() as unknown as ComponentNode,
    createText: () => new MockTextNode() as unknown as TextNode,
    loadFontAsync: async (font: FontName) => {
      loadFontAsyncCalls.push(font);
    },
    getLocalTextStylesAsync: async () => [
      { id: 'style-token-name', name: '_Doc/TokenName' },
      { id: 'style-caption', name: '_Doc/Caption' },
    ],
    variables: {
      getLocalVariablesAsync: async () => [
        { id: 'var-bg-variant', name: 'color/background/variant' },
        { id: 'var-content', name: 'color/background/content' },
      ],
      setBoundVariableForPaint: (paint: SolidPaint, _field: string, _variable: Variable) => {
        return Object.assign({}, paint, { boundVariables: { color: { id: 'mock-var' } } });
      },
    },
  };
}

export function asComponentSetNode(mock: MockComponentSet): ComponentSetNode {
  return mock as unknown as ComponentSetNode;
}

export function asPageNode(mock: MockPage): PageNode {
  return mock as unknown as PageNode;
}

export { MockTextNode, createMockFrame };
