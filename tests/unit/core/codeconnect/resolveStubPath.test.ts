import { describe, expect, it } from 'vitest';

import { resolveStubPath } from '@/core/codeconnect/resolveStubPath';

describe('resolveStubPath', () => {
  it('resolves button stub path and import path', () => {
    const result = resolveStubPath({
      specsPath: 'design/components',
      componentKey: 'button',
      componentName: 'Button',
    });
    expect(result.relativePath).toBe('design/components/button/Button.figma.tsx');
    expect(result.implementationImportPath).toBe('./button');
  });
});
