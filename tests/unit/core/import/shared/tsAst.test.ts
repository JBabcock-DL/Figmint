import { describe, expect, it } from 'vitest';

import {
  collectImportBindings,
  collectJsxComponentTags,
  createTsxSourceFile,
} from '@/core/import/shared/tsAst';

describe('tsAst', () => {
  it('collects named imports', () => {
    const source = "import { Icon, Box as B } from './path';\n";
    const sf = createTsxSourceFile('test.tsx', source);
    const bindings = collectImportBindings(sf);
    expect(bindings).toEqual([
      { localName: 'Icon', moduleSpecifier: './path', isDefault: false },
      { localName: 'B', moduleSpecifier: './path', isDefault: false },
    ]);
  });

  it('collects default import', () => {
    const source = "import Box from '../box';\n";
    const sf = createTsxSourceFile('test.tsx', source);
    const bindings = collectImportBindings(sf);
    expect(bindings).toEqual([{ localName: 'Box', moduleSpecifier: '../box', isDefault: true }]);
  });

  it('skips type-only imports', () => {
    const source = "import type { Foo } from './foo';\n";
    const sf = createTsxSourceFile('test.tsx', source);
    expect(collectImportBindings(sf)).toEqual([]);
  });

  it('collects JSX self-closing and paired tags, skips intrinsics', () => {
    const source = '<><Icon /><div /><Box>hi</Box></>';
    const sf = createTsxSourceFile('test.tsx', source);
    const tags = collectJsxComponentTags(sf);
    expect(
      tags.map(function (t) {
        return t.tagName;
      }),
    ).toEqual(['Icon', 'Box']);
  });
});
