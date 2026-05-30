import { describe, expect, it } from 'vitest';

import buttonRef from '@/core/codeconnect/__fixtures__/unmapped-button-ref.json';
import { mapFigmaPropsToCodeConnect } from '@/core/codeconnect/mapFigmaPropsToCodeConnect';

describe('mapFigmaPropsToCodeConnect', () => {
  it('maps button component properties to figma.connect prop lines', () => {
    const result = mapFigmaPropsToCodeConnect(buttonRef.componentProperties);
    expect(result.propLines).toMatchInlineSnapshot(`
      [
        "      variant: figma.enum('Variant', { Default: 'default', Destructive: 'destructive' }),",
        "      disabled: figma.boolean('Disabled'),",
        "      label: figma.string('Label'),",
      ]
    `);
    expect(result.examplePropNames).toEqual(['variant', 'disabled', 'label']);
  });
});
