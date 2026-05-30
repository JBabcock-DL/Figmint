import { describe, expect, it } from 'vitest';

import buttonRef from '@/core/codeconnect/__fixtures__/unmapped-button-ref.json';
import { ReactMappingTemplate } from '@/core/codeconnect/templates/react';

describe('ReactMappingTemplate', () => {
  it('generates figma.connect stub matching golden shape', () => {
    const template = new ReactMappingTemplate();
    const stub = template.generateStub({
      component: buttonRef,
      repoComponentsRoot: 'design/components',
      implementationImportPath: './button',
      figmaFileSlug: 'Design System',
    });

    expect(stub.relativePath).toBe('design/components/button/Button.figma.tsx');
    expect(stub.content).toContain("import figma from '@figma/code-connect'");
    expect(stub.content).toContain("import { Button } from './button'");
    expect(stub.content).toContain('figma.connect(');
    expect(stub.content).toContain(
      "https://www.figma.com/design/abc123/Design%20System?node-id=1-2",
    );
    expect(stub.content).toContain("variant: figma.enum('Variant'");
    expect(stub.content).toContain('example: (props) => <Button {...props} />');
  });
});
