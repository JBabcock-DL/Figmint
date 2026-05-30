import { describe, expect, it } from 'vitest';

import { createTsxSourceFile } from '@/core/import/templates/react/createSource';
import { findExportedComponent } from '@/core/import/templates/react/findExportedComponent';

describe('findExportedComponent', () => {
  it('resolves forwardRef export', () => {
    const source = `
import { forwardRef } from 'react';
export const Button = forwardRef(function Button(props, ref) {
  return <button ref={ref} />;
});
`;
    const match = findExportedComponent(createTsxSourceFile('button.tsx', source));
    expect(match).not.toBeNull();
    expect(match!.name).toBe('Button');
    expect(match!.kind).toBe('forwardRef');
  });

  it('resolves memo export', () => {
    const source = `
import { memo } from 'react';
export const Button = memo(function Button() {
  return <button />;
});
`;
    const match = findExportedComponent(createTsxSourceFile('button.tsx', source));
    expect(match).not.toBeNull();
    expect(match!.name).toBe('Button');
    expect(match!.kind).toBe('memo');
  });

  it('returns null when no export', () => {
    const source = 'function Button() { return null; }';
    expect(findExportedComponent(createTsxSourceFile('button.tsx', source))).toBeNull();
  });
});
