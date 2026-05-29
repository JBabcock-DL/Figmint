/// <reference types="@figma/plugin-typings" />

let nextFrameId = 1;
let nextTextId = 1;

export type MockFrameOverrides = Partial<{
  name: string;
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  width: number;
  height: number;
  primaryAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
}>;

export class MockTextNode {
  readonly type = 'TEXT' as const;
  id: string;
  name = 'Text';
  characters = '';
  width = 10;
  height = 10;
  fontSize = 12;
  textStyleId = '';
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' = 'LEFT';
  textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE' = 'NONE';
  layoutAlign: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT' = 'INHERIT';
  layoutSizingVertical: 'FIXED' | 'HUG' = 'FIXED';
  layoutSizingHorizontal: 'FIXED' | 'FILL' | 'HUG' = 'FIXED';
  fills: Paint[] = [];
  parent: MockFrame | null = null;

  constructor() {
    this.id = `text-${String(nextTextId++)}`;
  }

  remove(): void {
    if (this.parent !== null) {
      const index = this.parent.children.indexOf(this as unknown as SceneNode);
      if (index >= 0) {
        this.parent.children.splice(index, 1);
      }
      this.parent = null;
    }
  }

  resize(w: number, h: number): void {
    this.width = w;
    if (this.textAutoResize === 'HEIGHT' && h <= 1 && this.characters.length > 0) {
      this.height = Math.max(this.fontSize + 4, 16);
      return;
    }
    this.height = h;
  }
}

export class MockFrame {
  readonly type = 'FRAME' as const;
  id: string;
  name = 'Frame';
  width = 100;
  height = 100;
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' = 'NONE';
  primaryAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO' = 'FIXED';
  counterAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO' = 'FIXED';
  layoutSizingVertical: 'FIXED' | 'HUG' = 'FIXED';
  layoutAlign: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT' = 'INHERIT';
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | 'BASELINE' = 'MIN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' = 'MIN';
  minHeight = 0;
  paddingLeft = 0;
  paddingRight = 0;
  paddingTop = 0;
  paddingBottom = 0;
  itemSpacing = 0;
  counterAxisSpacing = 0;
  layoutWrap: 'NO_WRAP' | 'WRAP' = 'NO_WRAP';
  cornerRadius = 0;
  strokeWeight = 0;
  dashPattern: number[] = [];
  clipsContent = false;
  visible = true;
  locked = false;
  fills: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  strokes: Paint[] = [];
  strokeTopWeight = 0;
  strokeBottomWeight = 0;
  strokeLeftWeight = 0;
  strokeRightWeight = 0;
  children: SceneNode[] = [];
  parent: MockFrame | null = null;
  private pluginData: Record<string, string> = {};

  private appendChildSetsChildFixed: boolean;

  constructor(overrides?: MockFrameOverrides, appendChildSetsChildFixed?: boolean) {
    this.id = `frame-${String(nextFrameId++)}`;
    this.appendChildSetsChildFixed = appendChildSetsChildFixed !== false;
    if (overrides !== undefined) {
      if (overrides.name !== undefined) {
        this.name = overrides.name;
      }
      if (overrides.layoutMode !== undefined) {
        this.layoutMode = overrides.layoutMode;
      }
      if (overrides.width !== undefined) {
        this.width = overrides.width;
      }
      if (overrides.height !== undefined) {
        this.height = overrides.height;
      }
      if (overrides.primaryAxisSizingMode !== undefined) {
        this.primaryAxisSizingMode = overrides.primaryAxisSizingMode;
      }
      if (overrides.counterAxisSizingMode !== undefined) {
        this.counterAxisSizingMode = overrides.counterAxisSizingMode;
      }
    }
  }

  remove(): void {
    if (this.parent !== null) {
      const index = this.parent.children.indexOf(this as unknown as SceneNode);
      if (index >= 0) {
        this.parent.children.splice(index, 1);
      }
      this.parent = null;
    }
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.primaryAxisSizingMode = 'FIXED';
    this.counterAxisSizingMode = 'FIXED';
  }

  resizeWithoutConstraints(w: number, h: number): void {
    this.resize(w, h);
  }

  appendChild(child: SceneNode): void {
    if (
      this.appendChildSetsChildFixed &&
      child.type === 'FRAME' &&
      'layoutSizingVertical' in child
    ) {
      (child as unknown as MockFrame).layoutSizingVertical = 'FIXED';
    }
    // Figma may reset parent Hug axis sizing when children are appended (§0.1 reassert).
    if (this.layoutMode === 'HORIZONTAL' && this.counterAxisSizingMode === 'AUTO') {
      this.counterAxisSizingMode = 'FIXED';
    } else if (this.layoutMode === 'VERTICAL' && this.primaryAxisSizingMode === 'AUTO') {
      this.primaryAxisSizingMode = 'FIXED';
    }
    const previousParent = (child as { parent?: MockFrame | null }).parent;
    if (previousParent !== undefined && previousParent !== null) {
      const index = previousParent.children.indexOf(child);
      if (index >= 0) {
        previousParent.children.splice(index, 1);
      }
    }
    (child as { parent?: MockFrame | null }).parent = this;
    this.children.push(child);
    this.applyStretchToChild(child);
    if (this.layoutMode === 'VERTICAL') {
      let totalHeight = this.paddingTop + this.paddingBottom;
      for (let i = 0; i < this.children.length; i++) {
        const entry = this.children[i] as { height?: number };
        totalHeight += entry.height !== undefined ? entry.height : 0;
        if (i > 0) {
          totalHeight += this.itemSpacing;
        }
      }
      if (totalHeight > this.height) {
        this.height = totalHeight;
      }
    } else if (this.layoutMode === 'HORIZONTAL') {
      let maxChildHeight = 0;
      for (let i = 0; i < this.children.length; i++) {
        const entry = this.children[i] as { height?: number };
        const childHeight = entry.height !== undefined ? entry.height : 0;
        if (childHeight > maxChildHeight) {
          maxChildHeight = childHeight;
        }
      }
      const totalHeight = this.paddingTop + this.paddingBottom + maxChildHeight;
      if (totalHeight > this.height) {
        this.height = totalHeight;
      }
    }
  }

  private applyStretchToChild(child: SceneNode): void {
    const childWithAlign = child as Partial<{
      layoutAlign: string;
      width: number;
      height: number;
    }>;
    if (childWithAlign.layoutAlign !== 'STRETCH') {
      return;
    }
    if (this.layoutMode === 'VERTICAL') {
      const inner = this.width - this.paddingLeft - this.paddingRight;
      if (inner > 0 && childWithAlign.width !== undefined) {
        childWithAlign.width = inner;
      }
    } else if (this.layoutMode === 'HORIZONTAL') {
      const inner = this.height - this.paddingTop - this.paddingBottom;
      if (inner > 0 && childWithAlign.height !== undefined) {
        childWithAlign.height = inner;
      }
    }
  }

  insertChild(index: number, child: SceneNode): void {
    if (
      this.appendChildSetsChildFixed &&
      child.type === 'FRAME' &&
      'layoutSizingVertical' in child
    ) {
      (child as unknown as MockFrame).layoutSizingVertical = 'FIXED';
    }
    const previousParent = (child as { parent?: MockFrame | null }).parent;
    if (previousParent !== undefined && previousParent !== null) {
      const prevIndex = previousParent.children.indexOf(child);
      if (prevIndex >= 0) {
        previousParent.children.splice(prevIndex, 1);
      }
    }
    (child as { parent?: MockFrame | null }).parent = this;
    const clamped = index < 0 ? 0 : index;
    this.children.splice(clamped, 0, child);
    if (this.layoutMode === 'VERTICAL') {
      let totalHeight = this.paddingTop + this.paddingBottom;
      for (let i = 0; i < this.children.length; i++) {
        const entry = this.children[i] as { height?: number };
        totalHeight += entry.height !== undefined ? entry.height : 0;
        if (i > 0) {
          totalHeight += this.itemSpacing;
        }
      }
      if (totalHeight > this.height) {
        this.height = totalHeight;
      }
    }
  }

  getPluginData(key: string): string {
    if (Object.prototype.hasOwnProperty.call(this.pluginData, key)) {
      return this.pluginData[key];
    }
    return '';
  }

  setPluginData(key: string, value: string): void {
    this.pluginData[key] = value;
  }

  findAll(
    callback?: (node: SceneNode) => boolean,
    options?: { type?: NodeType },
  ): SceneNode[] {
    const matches: SceneNode[] = [];
    const visit = function visit(node: SceneNode): void {
      let typeOk = true;
      if (options?.type !== undefined) {
        typeOk = node.type === options.type;
      }
      let callbackOk = true;
      if (callback !== undefined) {
        callbackOk = callback(node);
      }
      if (typeOk && callbackOk) {
        matches.push(node);
      }
      if ('children' in node) {
        const container = node as { children: SceneNode[] };
        for (let i = 0; i < container.children.length; i++) {
          visit(container.children[i]);
        }
      }
    };
    visit(this as unknown as SceneNode);
    return matches;
  }
}

export function createMockFrame(
  overrides?: MockFrameOverrides,
  appendChildSetsChildFixed?: boolean,
): MockFrame {
  return new MockFrame(overrides, appendChildSetsChildFixed);
}

export function resetMockFigmaFrames(): void {
  nextFrameId = 1;
  nextTextId = 1;
}

let setBoundVariableForPaintCalls = 0;

export function getSetBoundVariableForPaintCallCount(): number {
  return setBoundVariableForPaintCalls;
}

export function installMockFigmaCanvas(): void {
  resetMockFigmaFrames();
  setBoundVariableForPaintCalls = 0;

  const globalRecord = globalThis as Record<string, unknown>;

  globalRecord.figma = {
    createFrame: () => new MockFrame() as unknown as FrameNode,
    createText: () => new MockTextNode() as unknown as TextNode,
    loadFontAsync: async (_font: FontName) => {
      return undefined;
    },
    variables: {
      setBoundVariableForPaint: (paint: SolidPaint, _field: string, _variable: Variable) => {
        setBoundVariableForPaintCalls += 1;
        return Object.assign({}, paint, { boundVariables: { color: { id: 'mock-var' } } });
      },
    },
  };
}

export function asFrameNode(mock: MockFrame): FrameNode {
  return mock as unknown as FrameNode;
}

export function asTextNode(mock: MockTextNode): TextNode {
  return mock as unknown as TextNode;
}
