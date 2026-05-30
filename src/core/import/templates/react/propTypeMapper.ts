import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';
import ts from 'typescript';

import {
  coerceBooleanDefault,
  coerceTextDefault,
} from '@/core/components/scaffold/propTypeMap';

function literalValueFromExpression(expr: ts.Expression): string | number | boolean | undefined {
  if (expr.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expr.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.text;
  }
  if (ts.isNumericLiteral(expr)) {
    return Number(expr.text);
  }
  return undefined;
}

function unionStringLiterals(typeNode: ts.TypeNode): string[] | null {
  if (!ts.isUnionTypeNode(typeNode)) {
    return null;
  }
  const values: string[] = [];
  for (let i = 0; i < typeNode.types.length; i++) {
    const member = typeNode.types[i];
    if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
      values.push(member.literal.text);
      continue;
    }
    if (member.kind === ts.SyntaxKind.StringKeyword) {
      return null;
    }
    if (member.kind === ts.SyntaxKind.UndefinedKeyword) {
      continue;
    }
    return null;
  }
  return values.length > 0 ? values : null;
}

function isBooleanType(typeNode: ts.TypeNode | undefined): boolean {
  if (typeNode === undefined) {
    return false;
  }
  if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
    return true;
  }
  if (ts.isUnionTypeNode(typeNode)) {
    let hasBoolean = false;
    let onlyOptional = true;
    for (let i = 0; i < typeNode.types.length; i++) {
      const t = typeNode.types[i];
      if (t.kind === ts.SyntaxKind.BooleanKeyword) {
        hasBoolean = true;
      } else if (t.kind !== ts.SyntaxKind.UndefinedKeyword) {
        onlyOptional = false;
      }
    }
    return hasBoolean && onlyOptional;
  }
  return false;
}

function isStringType(typeNode: ts.TypeNode | undefined): boolean {
  if (typeNode === undefined) {
    return false;
  }
  if (typeNode.kind === ts.SyntaxKind.StringKeyword) {
    return true;
  }
  if (ts.isUnionTypeNode(typeNode)) {
    let hasString = false;
    for (let i = 0; i < typeNode.types.length; i++) {
      const t = typeNode.types[i];
      if (t.kind === ts.SyntaxKind.StringKeyword) {
        hasString = true;
      } else if (t.kind !== ts.SyntaxKind.UndefinedKeyword) {
        return false;
      }
    }
    return hasString;
  }
  return false;
}

function isButtonTypeAccess(typeNode: ts.TypeNode): boolean {
  if (!ts.isTypeReferenceNode(typeNode)) {
    return false;
  }
  if (!ts.isQualifiedName(typeNode.typeName)) {
    return false;
  }
  const left = typeNode.typeName.left;
  const right = typeNode.typeName.right;
  if (!ts.isQualifiedName(left)) {
    return false;
  }
  if (left.left.getText() === 'React' && left.right.text === 'ComponentProps' && right.text === 'type') {
    return true;
  }
  return false;
}

export function mapTsTypeToSpecProp(
  name: string,
  typeNode: ts.TypeNode | undefined,
  initializer?: ts.Expression,
  cvaEnums?: Record<string, string[]>,
): ComponentSpecProp | null {
  const initValue = initializer !== undefined ? literalValueFromExpression(initializer) : undefined;

  if (cvaEnums !== undefined && cvaEnums[name] !== undefined) {
    const enumValues = cvaEnums[name];
    const defaultVal =
      initValue !== undefined && typeof initValue === 'string' ? initValue : enumValues[0];
    return { name: name, type: 'enum', enum: enumValues.slice(), default: defaultVal };
  }

  if (name === 'type') {
    if (typeNode !== undefined && isButtonTypeAccess(typeNode)) {
      return {
        name: 'type',
        type: 'enum',
        enum: ['button', 'submit', 'reset'],
        default: initValue !== undefined && typeof initValue === 'string' ? initValue : 'button',
      };
    }
    if (typeNode === undefined) {
      return {
        name: 'type',
        type: 'enum',
        enum: ['button', 'submit', 'reset'],
        default: initValue !== undefined && typeof initValue === 'string' ? initValue : 'button',
      };
    }
  }

  if (typeNode !== undefined) {
    const unionValues = unionStringLiterals(typeNode);
    if (unionValues !== null) {
      const defaultVal =
        initValue !== undefined && typeof initValue === 'string' ? initValue : unionValues[0];
      return { name: name, type: 'enum', enum: unionValues, default: defaultVal };
    }
  }

  if (isBooleanType(typeNode) || name === 'asChild' || name === 'disabled' || name === 'loading') {
    return {
      name: name,
      type: 'boolean',
      default: coerceBooleanDefault(initValue),
    };
  }

  if (isStringType(typeNode) || name === 'className') {
    return {
      name: name,
      type: 'string',
      default: coerceTextDefault(initValue),
    };
  }

  if (typeNode !== undefined && ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    if (typeNode.typeName.text === 'VariantProps') {
      return null;
    }
  }

  return null;
}

export function mapPropsInterface(
  members: ts.NodeArray<ts.TypeElement> | ts.TypeElement[],
  cvaEnums?: Record<string, string[]>,
): ComponentSpecProp[] {
  const result: ComponentSpecProp[] = [];
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (!ts.isPropertySignature(member) || member.name === undefined) {
      continue;
    }
    let propName: string | null = null;
    if (ts.isIdentifier(member.name)) {
      propName = member.name.text;
    } else if (ts.isStringLiteral(member.name)) {
      propName = member.name.text;
    }
    if (propName === null) {
      continue;
    }
    const mapped = mapTsTypeToSpecProp(propName, member.type, undefined, cvaEnums);
    if (mapped !== null) {
      result.push(mapped);
    }
  }
  return result;
}
