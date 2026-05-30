import { describe, expect, it } from 'vitest';

import { mapPropsInterface, mapTsTypeToSpecProp } from '@/core/import/templates/react/propTypeMapper';
import ts from 'typescript';

function propFromSource(source: string): ReturnType<typeof mapTsTypeToSpecProp> {
  const file = ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const stmt = file.statements[0];
  if (!ts.isTypeAliasDeclaration(stmt) || stmt.type === undefined) {
    return null;
  }
  return mapTsTypeToSpecProp('test', stmt.type);
}

describe('propTypeMapper', () => {
  const cvaEnums = {
    variant: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    size: ['sm', 'default', 'lg', 'icon'],
  };

  it('maps all 7 canonical button props', () => {
    const members: ts.TypeElement[] = [];
    const sourceFile = ts.createSourceFile(
      'props.ts',
      `interface ButtonProps {
        asChild?: boolean;
        type?: 'button' | 'submit' | 'reset';
        loading?: boolean;
      }`,
      ts.ScriptTarget.Latest,
      true,
    );
    const iface = sourceFile.statements[0];
    if (ts.isInterfaceDeclaration(iface)) {
      for (let m = 0; m < iface.members.length; m++) {
        members.push(iface.members[m]);
      }
    }

    const fromInterface = mapPropsInterface(members, cvaEnums);
    const variant = mapTsTypeToSpecProp('variant', undefined, undefined, cvaEnums);
    const size = mapTsTypeToSpecProp('size', undefined, undefined, cvaEnums);
    const disabled = mapTsTypeToSpecProp('disabled', undefined, undefined, cvaEnums);
    const className = mapTsTypeToSpecProp('className', undefined, undefined, cvaEnums);

    const all = fromInterface.concat([
      variant!,
      size!,
      disabled!,
      className!,
    ]);

    expect(all.find((p) => p.name === 'variant')?.enum).toHaveLength(6);
    expect(all.find((p) => p.name === 'size')?.enum).toHaveLength(4);
    expect(all.find((p) => p.name === 'disabled')).toEqual({ name: 'disabled', type: 'boolean', default: false });
    expect(all.find((p) => p.name === 'asChild')).toEqual({ name: 'asChild', type: 'boolean', default: false });
    expect(all.find((p) => p.name === 'type')?.enum).toEqual(['button', 'submit', 'reset']);
    expect(all.find((p) => p.name === 'className')).toEqual({ name: 'className', type: 'string', default: '' });
    expect(all.find((p) => p.name === 'loading')).toEqual({ name: 'loading', type: 'boolean', default: false });
  });

  it('maps union of string literals to enum', () => {
    const mapped = propFromSource("type X = 'a' | 'b'");
    expect(mapped?.type).toBe('enum');
    expect(mapped?.enum).toEqual(['a', 'b']);
  });
});
