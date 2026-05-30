import ts from 'typescript';

import type { ExportedComponentMatch } from './findExportedComponent';
import {
  extractStringLiteralsFromExpression,
  findCvaVariantMap,
  splitClassString,
} from './parseCvaVariants';
import type { CvaVariantMap } from './types';

function collectFromCvaMap(sourceFile: ts.SourceFile, cvaMap: CvaVariantMap | null): string[] {
  const tokens: string[] = [];
  if (cvaMap === null) {
    return tokens;
  }

  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === cvaMap!.bindingName) {
      if (node.initializer !== undefined && ts.isCallExpression(node.initializer)) {
        const call = node.initializer;
        if (call.arguments.length > 0) {
          const baseLiterals = extractStringLiteralsFromExpression(call.arguments[0]);
          for (let i = 0; i < baseLiterals.length; i++) {
            const parts = splitClassString(baseLiterals[i]);
            for (let p = 0; p < parts.length; p++) {
              tokens.push(parts[p]);
            }
          }
        }
        if (call.arguments.length > 1 && ts.isObjectLiteralExpression(call.arguments[1])) {
          const config = call.arguments[1];
          for (let i = 0; i < config.properties.length; i++) {
            const prop = config.properties[i];
            if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) {
              continue;
            }
            for (let j = 0; j < prop.initializer.properties.length; j++) {
              const variantProp = prop.initializer.properties[j];
              if (ts.isPropertyAssignment(variantProp)) {
                const literals = extractStringLiteralsFromExpression(variantProp.initializer);
                for (let k = 0; k < literals.length; k++) {
                  const parts = splitClassString(literals[k]);
                  for (let p = 0; p < parts.length; p++) {
                    tokens.push(parts[p]);
                  }
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return tokens;
}

function visitComponentBody(match: ExportedComponentMatch, visit: (node: ts.Node) => void): void {
  const node = match.node;
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    if (node.body !== undefined) {
      ts.forEachChild(node.body, visit);
    }
  }
}

function collectFromComponentBody(match: ExportedComponentMatch): string[] {
  const tokens: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'className') {
      if (node.initializer !== undefined) {
        if (ts.isStringLiteral(node.initializer)) {
          const parts = splitClassString(node.initializer.text);
          for (let p = 0; p < parts.length; p++) {
            tokens.push(parts[p]);
          }
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression !== undefined) {
          const literals = extractStringLiteralsFromExpression(node.initializer.expression);
          for (let i = 0; i < literals.length; i++) {
            const parts = splitClassString(literals[i]);
            for (let p = 0; p < parts.length; p++) {
              tokens.push(parts[p]);
            }
          }
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && (callee.text === 'cn' || callee.text === 'clsx')) {
        for (let i = 0; i < node.arguments.length; i++) {
          const literals = extractStringLiteralsFromExpression(node.arguments[i]);
          for (let j = 0; j < literals.length; j++) {
            const parts = splitClassString(literals[j]);
            for (let p = 0; p < parts.length; p++) {
              tokens.push(parts[p]);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visitComponentBody(match, visit);
  return tokens;
}

export function collectClassTokensFromComponent(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
  cvaMap: CvaVariantMap | null,
): string[] {
  const resolvedMap = cvaMap !== null ? cvaMap : findCvaVariantMap(sourceFile);
  const seen: Record<string, boolean> = {};
  const result: string[] = [];

  function addToken(token: string): void {
    if (token.length === 0 || seen[token]) {
      return;
    }
    seen[token] = true;
    result.push(token);
  }

  const fromCva = collectFromCvaMap(sourceFile, resolvedMap);
  for (let i = 0; i < fromCva.length; i++) {
    addToken(fromCva[i]);
  }

  const fromBody = collectFromComponentBody(match);
  for (let i = 0; i < fromBody.length; i++) {
    addToken(fromBody[i]);
  }

  return result;
}
