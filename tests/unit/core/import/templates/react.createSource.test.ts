import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { createTsxSourceFile } from '@/core/import/templates/react/createSource';

describe('createTsxSourceFile', () => {
  it('parses minimal JSX without throwing', () => {
    const source = 'export function Button() { return <button />; }';
    const sourceFile = createTsxSourceFile('button.tsx', source);
    expect(sourceFile.languageVariant).toBe(ts.LanguageVariant.JSX);
  });
});
