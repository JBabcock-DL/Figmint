import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createTsxSourceFile } from '@/core/import/templates/react/createSource';
import { findExportedComponent } from '@/core/import/templates/react/findExportedComponent';
import { collectClassTokensFromComponent } from '@/core/import/templates/react/collectClassTokens';
import { findCvaVariantMap } from '@/core/import/templates/react/parseCvaVariants';
import { inferLayoutFromRootJsx } from '@/core/import/templates/react/parseJsxLayout';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

describe('inferLayoutFromRootJsx', () => {
  it('infers horizontal layout with gap and padding from button fixture', () => {
    const sourceFile = createTsxSourceFile('button.tsx', buttonSource);
    const match = findExportedComponent(sourceFile)!;
    const cvaMap = findCvaVariantMap(sourceFile);
    const tokens = collectClassTokensFromComponent(match, sourceFile, cvaMap);
    const result = inferLayoutFromRootJsx(match, sourceFile, tokens);

    expect(result.layout).toEqual({
      direction: 'horizontal',
      gap: '8',
      padding: '16',
      sizing: { horizontal: 'hug', vertical: 'hug' },
    });
    expect(result.confidence).toBe('high');
  });
});
