import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createTsxSourceFile } from '@/core/import/templates/react/createSource';
import { findExportedComponent } from '@/core/import/templates/react/findExportedComponent';
import { findCvaVariantMap } from '@/core/import/templates/react/parseCvaVariants';
import { parsePropsFromComponent } from '@/core/import/templates/react/parseProps';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

describe('parsePropsFromComponent', () => {
  it('produces 7 props and variant × size matrix', () => {
    const sourceFile = createTsxSourceFile('button.tsx', buttonSource);
    const match = findExportedComponent(sourceFile)!;
    const cvaMap = findCvaVariantMap(sourceFile);
    const result = parsePropsFromComponent(match, sourceFile, cvaMap);

    expect(result.props).toHaveLength(7);
    expect(result.variantMatrix.variant).toHaveLength(6);
    expect(result.variantMatrix.size).toHaveLength(4);
    expect(result.componentProps).toEqual({
      label: true,
      leadingIcon: true,
      trailingIcon: true,
    });
  });
});
