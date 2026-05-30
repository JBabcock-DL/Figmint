import ts from 'typescript';

import type { CvaVariantMap } from './types';

function stringLiteralValue(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function readVariantKeysFromObject(obj: ts.ObjectLiteralExpression): Record<string, string[]> {
  const axes: Record<string, string[]> = {};
  for (let i = 0; i < obj.properties.length; i++) {
    const prop = obj.properties[i];
    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }
    if (!ts.isIdentifier(prop.name)) {
      continue;
    }
    const axisName = prop.name.text;
    if (!ts.isObjectLiteralExpression(prop.initializer)) {
      continue;
    }
    const values: string[] = [];
    for (let j = 0; j < prop.initializer.properties.length; j++) {
      const variantProp = prop.initializer.properties[j];
      if (ts.isPropertyAssignment(variantProp) && ts.isIdentifier(variantProp.name)) {
        values.push(variantProp.name.text);
      } else if (ts.isShorthandPropertyAssignment(variantProp)) {
        values.push(variantProp.name.text);
      }
    }
    if (values.length > 0) {
      axes[axisName] = values;
    }
  }
  return axes;
}

function readVariantsFromCvaCall(call: ts.CallExpression): Record<string, string[]> | null {
  if (call.arguments.length < 2) {
    return null;
  }
  const configArg = call.arguments[1];
  if (!ts.isObjectLiteralExpression(configArg)) {
    return null;
  }
  for (let i = 0; i < configArg.properties.length; i++) {
    const prop = configArg.properties[i];
    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }
    if (!ts.isIdentifier(prop.name) || prop.name.text !== 'variants') {
      continue;
    }
    if (!ts.isObjectLiteralExpression(prop.initializer)) {
      return null;
    }
    return readVariantKeysFromObject(prop.initializer);
  }
  return null;
}

function readDefaultVariantsFromCvaCall(call: ts.CallExpression): Record<string, string> {
  const defaults: Record<string, string> = {};
  if (call.arguments.length < 2 || !ts.isObjectLiteralExpression(call.arguments[1])) {
    return defaults;
  }
  const config = call.arguments[1];
  for (let i = 0; i < config.properties.length; i++) {
    const prop = config.properties[i];
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      continue;
    }
    if (prop.name.text !== 'defaultVariants') {
      continue;
    }
    if (!ts.isObjectLiteralExpression(prop.initializer)) {
      return defaults;
    }
    for (let j = 0; j < prop.initializer.properties.length; j++) {
      const dv = prop.initializer.properties[j];
      if (ts.isPropertyAssignment(dv) && ts.isIdentifier(dv.name) && ts.isStringLiteral(dv.initializer)) {
        defaults[dv.name.text] = dv.initializer.text;
      }
    }
  }
  return defaults;
}

export function findCvaVariantMap(sourceFile: ts.SourceFile): CvaVariantMap | null {
  let result: CvaVariantMap | null = null;

  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const init = node.initializer;
      if (ts.isCallExpression(init)) {
        const callee = init.expression;
        if (ts.isIdentifier(callee) && callee.text === 'cva') {
          const axes = readVariantsFromCvaCall(init);
          if (axes !== null && Object.keys(axes).length > 0) {
            result = {
              axes: axes,
              bindingName: node.name.text,
              defaults: readDefaultVariantsFromCvaCall(init),
            };
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return result;
}

export function extractStringLiteralsFromExpression(expr: ts.Expression): string[] {
  const literals: string[] = [];
  const text = stringLiteralValue(expr);
  if (text !== null) {
    literals.push(text);
    return literals;
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    const calleeName = ts.isIdentifier(callee) ? callee.text : null;
    if (calleeName === 'cn' || calleeName === 'clsx' || calleeName === 'twMerge') {
      for (let i = 0; i < expr.arguments.length; i++) {
        const argLiterals = extractStringLiteralsFromExpression(expr.arguments[i]);
        for (let j = 0; j < argLiterals.length; j++) {
          literals.push(argLiterals[j]);
        }
      }
    }
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = extractStringLiteralsFromExpression(expr.left);
    const right = extractStringLiteralsFromExpression(expr.right);
    for (let i = 0; i < left.length; i++) {
      literals.push(left[i]);
    }
    for (let i = 0; i < right.length; i++) {
      literals.push(right[i]);
    }
  }
  return literals;
}

export function splitClassString(classString: string): string[] {
  return classString.split(/\s+/).filter(function (token) {
    return token.length > 0;
  });
}
