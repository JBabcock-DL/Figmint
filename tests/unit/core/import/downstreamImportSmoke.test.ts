import { describe, expect, it } from 'vitest';

import { getMappingTemplate } from '@/core/codeconnect';
import { createNotImplementedTokenResolver, getImportTemplate } from '@/core/import';

describe('downstream import smoke', () => {
  it('exports registry functions from both barrels', () => {
    expect(typeof getImportTemplate).toBe('function');
    expect(typeof getMappingTemplate).toBe('function');
  });

  it('react import stub round-trip has framework react', () => {
    const template = getImportTemplate('react');
    expect(template).not.toBeNull();
    if (template === null) {
      return;
    }
    const result = template.parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: '',
      tokenResolver: createNotImplementedTokenResolver(),
      registryKeys: [],
    });
    expect(result.spec.framework).toBe('react');
  });
});
