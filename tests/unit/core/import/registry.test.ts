import { describe, expect, it } from 'vitest';

import { createNotImplementedTokenResolver, getImportTemplate, listSupportedImportFrameworks } from '@/core/import';

describe('import registry', () => {
  it('getImportTemplate("react") returns non-null', () => {
    expect(getImportTemplate('react')).not.toBeNull();
  });

  it('getImportTemplate("vue") returns null', () => {
    expect(getImportTemplate('vue')).toBeNull();
  });

  it('listSupportedImportFrameworks returns react only', () => {
    expect(listSupportedImportFrameworks()).toEqual(['react']);
  });

  it('parse returns component-spec v1 without stub warning', () => {
    const template = getImportTemplate('react');
    expect(template).not.toBeNull();
    if (template === null) {
      return;
    }
    const result = template.parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: 'export function Button() { return <button />; }',
      tokenResolver: createNotImplementedTokenResolver(),
      registryKeys: [],
    });
    expect(result.spec.kind).toBe('component-spec');
    expect(result.spec.v).toBe(1);
    expect(result.issues.some(function (issue) { return issue.code === 'STUB'; })).toBe(false);
  });
});
