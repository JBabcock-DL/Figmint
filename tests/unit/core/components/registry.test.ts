import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ComponentSpecV1, RegistryV1 } from '@detroitlabs/fighub-contracts';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import {
  assertRegistryFileKey,
  buildRegistryEntry,
  createEmptyRegistry,
  mergeRegistryEntry,
  normalizeRegistryInput,
  resolveComponentKey,
  upsertRegistryEntry,
} from '@/core/components/registry';
import { REGISTRY_FILE_KEY_MISMATCH, RegistryMergeError } from '@/core/components/registry.types';
import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';

import buttonSpec from '../../../fixtures/component-spec/chip-button-minimal.v1.json';
import composedSpec from '../../../fixtures/component-spec/composed-button-group.v1.json';
import {
  asComponentSetNode,
  asPageNode,
  createMockComponentSet,
  createMockPage,
} from './scaffold/__mocks__/figmaScaffold';

const fixturesDir = join(process.cwd(), 'tests/fixtures/registry');
const fixedNow = new Date('2026-05-28T00:00:00.000Z');

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as unknown;
}

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

describe('registry core', () => {
  it('SPK-026-3 normalizeRegistryInput accepts legacy body without envelope', () => {
    const normalized = normalizeRegistryInput(readFixture('legacy-no-envelope.json'));
    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.registry.v).toBe(1);
      expect(normalized.registry.kind).toBe('registry');
      expect(normalized.registry.fileKey).toBe('legacy-file-key');
    }
  });

  it('normalizeRegistryInput rejects extra envelope properties', () => {
    const normalized = normalizeRegistryInput({
      v: 1,
      kind: 'registry',
      fileKey: 'abc',
      components: {},
      extra: true,
    });
    expect(normalized.ok).toBe(false);
  });

  it('greenfield upsert sets version 1 with ComponentSet nodeId and key', () => {
    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    page.name = '↳ Buttons';
    const spec = buttonSpec as ComponentSpecV1;
    const registry = upsertRegistryEntry({
      registry: null,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: fixedNow,
    });

    expect(registry.components.Button.version).toBe(1);
    expect(registry.components.Button.nodeId).toBe('CS:1');
    expect(registry.components.Button.key).toBe('abc123');
    expect(registry.components.Button.pageName).toBe('↳ Buttons');
    expect(registry.components.Button.publishedAt).toBe('2026-05-28T00:00:00.000Z');
    expect(registry.components.Button.cvaHash).toBe(hashVariantMatrix(spec.variantMatrix));
  });

  it('SPK-026-1 second upsert same spec.name bumps version to 2 with single row', () => {
    const componentSet = createMockComponentSet({ id: 'CS:2' });
    const page = createMockPage();
    page.name = '↳ Buttons';
    const spec = buttonSpec as ComponentSpecV1;
    const first = upsertRegistryEntry({
      registry: null,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: fixedNow,
    });
    const second = upsertRegistryEntry({
      registry: first,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: new Date('2026-05-28T12:00:00.000Z'),
    });

    expect(second.components.Button.version).toBe(2);
    expect(Object.keys(second.components)).toEqual(['Button']);
  });

  it('upsert Button leaves Input entry unchanged', () => {
    const existing: RegistryV1 = {
      v: 1,
      kind: 'registry',
      fileKey: 'mock-file-key',
      components: {
        Input: {
          nodeId: '2:20',
          key: 'input-key',
          pageName: '↳ Buttons',
          publishedAt: '2026-05-28T00:00:00.000Z',
          version: 1,
        },
      },
    };
    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    const spec = buttonSpec as ComponentSpecV1;
    const registry = upsertRegistryEntry({
      registry: existing,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: fixedNow,
    });

    expect(registry.components.Input).toEqual(existing.components.Input);
    expect(registry.components.Button.version).toBe(1);
  });

  it('SPK-026-2 fileKey mismatch throws REGISTRY_FILE_KEY_MISMATCH', () => {
    const existing = readFixture('filekey-mismatch-existing.json') as RegistryV1;
    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    const spec = buttonSpec as ComponentSpecV1;

    expect(function () {
      upsertRegistryEntry({
        registry: existing,
        spec: spec,
        scaffold: buildScaffoldResult(componentSet),
        targetPage: asPageNode(page),
        fileKey: 'mock-file-key',
        now: fixedNow,
      });
    }).toThrow(RegistryMergeError);

    try {
      upsertRegistryEntry({
        registry: existing,
        spec: spec,
        scaffold: buildScaffoldResult(componentSet),
        targetPage: asPageNode(page),
        fileKey: 'mock-file-key',
        now: fixedNow,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RegistryMergeError);
      expect((error as RegistryMergeError).code).toBe(REGISTRY_FILE_KEY_MISMATCH);
    }

    expect(existing.components.Input.version).toBe(1);
  });

  it('mergeRegistryEntry replaces existing component row', () => {
    const registry = createEmptyRegistry('mock-file-key');
    const entry = {
      nodeId: 'CS:1',
      key: 'abc123',
      pageName: '↳ Buttons',
      publishedAt: '2026-05-28T00:00:00.000Z',
      version: 1,
    };
    const merged = mergeRegistryEntry(registry, 'Button', entry);
    expect(merged.components.Button).toEqual(entry);

    const replaced = mergeRegistryEntry(merged, 'Button', {
      nodeId: 'CS:9',
      key: 'abc123',
      pageName: '↳ Buttons',
      publishedAt: '2026-05-28T12:00:00.000Z',
      version: 2,
    });
    expect(replaced.components.Button.version).toBe(2);
    expect(Object.keys(replaced.components)).toEqual(['Button']);
  });

  it('assertRegistryFileKey throws on mismatch', () => {
    const registry = createEmptyRegistry('other-file-key');
    expect(function () {
      assertRegistryFileKey(registry, 'mock-file-key');
    }).toThrow(RegistryMergeError);
  });

  it('resolveComponentKey reads kebab alias but write uses spec.name', () => {
    const registry: RegistryV1 = {
      v: 1,
      kind: 'registry',
      fileKey: 'mock-file-key',
      components: {
        button: {
          nodeId: '1:10',
          key: 'legacy-key',
          pageName: '↳ Buttons',
          publishedAt: '2026-05-01T00:00:00.000Z',
          version: 3,
        },
      },
    };

    expect(resolveComponentKey(registry, 'Button')).toBe('button');

    const componentSet = createMockComponentSet({ id: 'CS:1' });
    const page = createMockPage();
    const spec = buttonSpec as ComponentSpecV1;
    const merged = upsertRegistryEntry({
      registry: registry,
      spec: spec,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      now: fixedNow,
    });

    expect(merged.components.Button.version).toBe(4);
    expect(merged.components.button).toBeUndefined();
  });

  it('buildRegistryEntry captures composedChildVersions from existing registry', () => {
    const existing: RegistryV1 = {
      v: 1,
      kind: 'registry',
      fileKey: 'mock-file-key',
      components: {
        button: {
          nodeId: '1:10',
          key: 'button-key',
          pageName: '↳ Buttons',
          publishedAt: '2026-05-28T00:00:00.000Z',
          version: 2,
        },
      },
    };
    const componentSet = createMockComponentSet({ id: 'CS:99' });
    const page = createMockPage();
    const entry = buildRegistryEntry({
      spec: composedSpec as ComponentSpecV1,
      scaffold: buildScaffoldResult(componentSet),
      targetPage: asPageNode(page),
      fileKey: 'mock-file-key',
      existingRegistry: existing,
      now: fixedNow,
    });

    expect(entry.composedChildVersions).toEqual({ button: 2 });
  });
});

describe('registry schema fixtures', () => {
  const schemaPath = join(process.cwd(), 'packages/contracts/dist/registry.v1.schema.json');
  const schemaRaw = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<string, unknown>;
  const schema = Object.assign({}, schemaRaw);
  delete schema.$schema;
  const ajv = new Ajv({ validateSchema: false });
  const validate = ajv.compile(schema);

  it('validates normalized registry fixtures', () => {
    const files = readdirSync(fixturesDir).filter(function (name) {
      return name.endsWith('.json');
    });
    for (const name of files) {
      const raw = readFixture(name);
      const normalized = normalizeRegistryInput(raw);
      expect(normalized.ok).toBe(true);
      if (normalized.ok) {
        expect(validate(normalized.registry)).toBe(true);
      }
    }
  });
});
