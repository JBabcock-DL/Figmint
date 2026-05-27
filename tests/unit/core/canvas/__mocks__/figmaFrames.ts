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
  textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE' = 'NONE';
  fills: Paint[] = [];
  parent: MockFrame | null = null;

  constructor() {
    this.id = `text-${String(nextTextId++)}`;
  }

  resize(w: number, h: number): void {
    this.width = w;
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
  cornerRadius = 0;
  clipsContent = false;
  fills: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  strokes: Paint[] = [];
  strokeTopWeight = 0;
  strokeBottomWeight = 0;
  strokeLeftWeight = 0;
  strokeRightWeight = 0;
  children: SceneNode[] = [];
  parent: MockFrame | null = null;

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
    if (this.appendChildSetsChildFixed && 'layoutSizingVertical' in child) {
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
