import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createTsxSourceFile } from '@/core/import/templates/react/createSource';
import { findCvaVariantMap } from '@/core/import/templates/react/parseCvaVariants';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

describe('findCvaVariantMap', () => {
  it('reads 6 variant keys and 4 size keys from button fixture', () => {
    const map = findCvaVariantMap(createTsxSourceFile('button.tsx', buttonSource));
    expect(map).not.toBeNull();
    expect(map!.axes.variant).toEqual([
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ]);
    expect(map!.axes.size).toEqual(['sm', 'default', 'lg', 'icon']);
  });
});
