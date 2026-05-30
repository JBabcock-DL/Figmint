import { describe, expect, it } from 'vitest';

import { getMappingTemplate, listSupportedMappingFrameworks } from '@/core/codeconnect';

describe('codeconnect registry', () => {
  it('getMappingTemplate("react") returns non-null with framework react', () => {
    const template = getMappingTemplate('react');
    expect(template).not.toBeNull();
    if (template !== null) {
      expect(template.framework).toBe('react');
    }
  });

  it('getMappingTemplate("vue") returns null', () => {
    expect(getMappingTemplate('vue')).toBeNull();
  });

  it('listSupportedMappingFrameworks returns react only', () => {
    expect(listSupportedMappingFrameworks()).toEqual(['react']);
  });

  it('generateStub returns MappingStubFile with .figma.tsx suffix', () => {
    const template = getMappingTemplate('react');
    expect(template).not.toBeNull();
    if (template === null) {
      return;
    }
    const stub = template.generateStub({
      component: {
        nodeId: '1:2',
        name: 'Button',
        componentKey: 'abc',
        fileKey: 'file',
        componentProperties: {},
      },
      repoComponentsRoot: 'components/',
      implementationImportPath: './button',
    });
    expect(stub.relativePath.endsWith('.figma.tsx')).toBe(true);
    expect(stub.content).toContain('figma.connect(');
    expect(stub.content).toContain("@figma/code-connect");
  });
});
