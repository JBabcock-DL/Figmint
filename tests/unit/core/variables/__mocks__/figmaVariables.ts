/// <reference types="@figma/plugin-typings" />

let nextCollectionId = 1;
let nextVariableId = 1;
let nextModeId = 1;

export interface MockFigmaStores {
  collections: MockVariableCollection[];
  variables: MockVariable[];
}

interface MockMode {
  modeId: string;
  name: string;
  parentModeId?: string;
}

export class MockVariableCollection {
  id: string;
  name: string;
  modes: MockMode[];
  variableIds: string[];
  readonly remote = false;
  readonly key = 'mock-key';
  readonly hiddenFromPublishing = false;
  readonly isExtension: boolean;
  readonly parentVariableCollectionId?: string;

  constructor(name: string, isExtension?: boolean, parentId?: string) {
    this.id = `col-${String(nextCollectionId++)}`;
    this.name = name;
    this.modes = [{ modeId: `mode-${String(nextModeId++)}`, name: 'Mode 1' }];
    this.variableIds = [];
    this.isExtension = isExtension === true;
    this.parentVariableCollectionId = parentId;
  }

  renameMode(modeId: string, newName: string): void {
    const mode = this.modes.find((entry) => entry.modeId === modeId);
    if (mode) {
      mode.name = newName;
    }
  }

  addMode(name: string): string {
    const modeId = `mode-${String(nextModeId++)}`;
    this.modes.push({ modeId, name });
    return modeId;
  }

  extend(name: string): ExtendedVariableCollection {
    const parentModes = this.modes;
    const extendedModes = parentModes.map((parentMode) => ({
      modeId: `mode-${String(nextModeId++)}`,
      name: parentMode.name,
      parentModeId: parentMode.modeId,
    }));

    const extended = new MockVariableCollection(name, true, this.id);
    extended.modes = extendedModes;
    mockStores.collections.push(extended);

    return extended as unknown as ExtendedVariableCollection;
  }

  remove(): void {
    const index = mockStores.collections.indexOf(this);
    if (index >= 0) {
      mockStores.collections.splice(index, 1);
    }
  }
}

export class MockVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: Record<string, VariableValue>;
  scopes: VariableScope[];
  description = '';
  readonly remote = false;
  readonly key = 'mock-var-key';
  readonly hiddenFromPublishing = false;
  codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string } = {};

  constructor(name: string, collectionId: string, resolvedType: VariableResolvedDataType) {
    this.id = `var-${String(nextVariableId++)}`;
    this.name = name;
    this.variableCollectionId = collectionId;
    this.resolvedType = resolvedType;
    this.valuesByMode = {};
    this.scopes = ['ALL_SCOPES'];
  }

  setValueForMode(modeId: string, value: VariableValue): void {
    this.valuesByMode[modeId] = value;
  }

  setVariableCodeSyntax(platform: CodeSyntaxPlatform, codeSyntax: string): void {
    this.codeSyntax[platform] = codeSyntax;
  }

  getPublishStatusAsync(): Promise<PublishStatus> {
    return Promise.resolve({ status: 'UNPUBLISHED' } as unknown as PublishStatus);
  }

  resolveForConsumer(_consumer: SceneNode): {
    value: VariableValue;
    resolvedType: VariableResolvedDataType;
  } {
    const firstMode = Object.keys(this.valuesByMode)[0];
    return {
      value: firstMode ? this.valuesByMode[firstMode] : 0,
      resolvedType: this.resolvedType,
    };
  }

  remove(): void {
    const index = mockStores.variables.indexOf(this);
    if (index >= 0) {
      mockStores.variables.splice(index, 1);
    }
  }

  removeVariableCodeSyntax(_platform: CodeSyntaxPlatform): void {
    return;
  }

  valuesByModeForCollectionAsync(
    _collection: VariableCollection,
  ): Promise<Record<string, VariableValue>> {
    return Promise.resolve(this.valuesByMode);
  }

  removeOverrideForMode(_extendedModeId: string): void {
    return;
  }
}

export const mockStores: MockFigmaStores = {
  collections: [],
  variables: [],
};

export function resetMockFigma(): void {
  nextCollectionId = 1;
  nextVariableId = 1;
  nextModeId = 1;
  mockStores.collections = [];
  mockStores.variables = [];
}

export function installMockFigmaVariables(): void {
  resetMockFigma();

  const globalRecord = globalThis as Record<string, unknown>;

  globalRecord.figma = {
    variables: {
      getLocalVariableCollectionsAsync: () =>
        Promise.resolve(mockStores.collections.slice() as unknown as VariableCollection[]),
      getLocalVariablesAsync: () =>
        Promise.resolve(mockStores.variables.slice() as unknown as Variable[]),
      getVariableByIdAsync: (id: string) => {
        const variable = mockStores.variables.find((entry) => entry.id === id);
        if (!variable) {
          return Promise.resolve(null);
        }
        return Promise.resolve(variable as unknown as Variable);
      },
      createVariableCollection: (name: string) => {
        const collection = new MockVariableCollection(name);
        mockStores.collections.push(collection);
        return collection as unknown as VariableCollection;
      },
      createVariable: (
        name: string,
        collection: VariableCollection,
        resolvedType: VariableResolvedDataType,
      ) => {
        const variable = new MockVariable(name, collection.id, resolvedType);
        mockStores.variables.push(variable);
        return variable as unknown as Variable;
      },
      createVariableAlias: (variable: Variable) => {
        return { type: 'VARIABLE_ALIAS' as const, id: variable.id };
      },
    },
    commitUndo: () => undefined,
  };
}

export function findCollectionByName(name: string): MockVariableCollection | undefined {
  return mockStores.collections.find((collection) => collection.name === name);
}

export function findVariable(collectionId: string, name: string): MockVariable | undefined {
  return mockStores.variables.find(
    (variable) => variable.variableCollectionId === collectionId && variable.name === name,
  );
}

export function asVariable(mock: MockVariable): Variable {
  return mock as unknown as Variable;
}
