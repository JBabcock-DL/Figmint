import ts from 'typescript';

export type ExportedComponentKind = 'function' | 'forwardRef' | 'memo';

export interface ExportedComponentMatch {
  name: string;
  kind: ExportedComponentKind;
  node: ts.Node;
  propsParameter?: ts.ParameterDeclaration;
}

function isPascalCase(name: string): boolean {
  if (name.length === 0) {
    return false;
  }
  const first = name.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase();
}

function unwrapForwardRefOrMemo(
  expression: ts.Expression,
): { inner: ts.Expression; kind: ExportedComponentKind } | null {
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  const callee = expression.expression;
  if (ts.isIdentifier(callee)) {
    if (callee.text === 'forwardRef') {
      const firstArg = expression.arguments[0];
      if (firstArg !== undefined) {
        return { inner: firstArg, kind: 'forwardRef' };
      }
    }
    if (callee.text === 'memo') {
      const firstArg = expression.arguments[0];
      if (firstArg !== undefined) {
        return { inner: firstArg, kind: 'memo' };
      }
    }
  }
  return null;
}

function functionNameFromNode(node: ts.FunctionLikeDeclaration): string | null {
  if (node.name !== undefined && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}

function propsParameterFromFunctionLike(node: ts.FunctionLikeDeclaration): ts.ParameterDeclaration | undefined {
  if (node.parameters.length === 0) {
    return undefined;
  }
  return node.parameters[0];
}

function matchFromInitializer(
  name: string,
  initializer: ts.Expression,
  exportKind: ExportedComponentKind,
): ExportedComponentMatch | null {
  const unwrapped = unwrapForwardRefOrMemo(initializer);
  if (unwrapped !== null) {
    const inner = unwrapped.inner;
    if (ts.isFunctionExpression(inner) || ts.isArrowFunction(inner)) {
      return {
        name: name,
        kind: unwrapped.kind,
        node: inner,
        propsParameter: propsParameterFromFunctionLike(inner),
      };
    }
    if (ts.isCallExpression(inner)) {
      const nested = unwrapForwardRefOrMemo(inner);
      if (nested !== null && (ts.isFunctionExpression(nested.inner) || ts.isArrowFunction(nested.inner))) {
        return {
          name: name,
          kind: nested.kind,
          node: nested.inner,
          propsParameter: propsParameterFromFunctionLike(nested.inner),
        };
      }
    }
  }
  if (ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer)) {
    return {
      name: name,
      kind: exportKind,
      node: initializer,
      propsParameter: propsParameterFromFunctionLike(initializer),
    };
  }
  return null;
}

function deriveNameFromPath(sourceFile: ts.SourceFile): string {
  const base = sourceFile.fileName.replace(/\\/g, '/').split('/').pop() || 'Component';
  const withoutExt = base.replace(/\.(tsx?|jsx?)$/, '');
  return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
}

function collectCandidates(sourceFile: ts.SourceFile): ExportedComponentMatch[] {
  const candidates: ExportedComponentMatch[] = [];
  const isExported = (modifiers: ts.NodeArray<ts.ModifierLike> | undefined): boolean => {
    if (modifiers === undefined) {
      return false;
    }
    for (let i = 0; i < modifiers.length; i++) {
      if (modifiers[i].kind === ts.SyntaxKind.ExportKeyword) {
        return true;
      }
    }
    return false;
  };

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && isExported(node.modifiers)) {
      const fnName = functionNameFromNode(node);
      if (fnName !== null && isPascalCase(fnName)) {
        candidates.push({
          name: fnName,
          kind: 'function',
          node: node,
          propsParameter: propsParameterFromFunctionLike(node),
        });
      }
    }

    if (ts.isVariableStatement(node) && isExported(node.modifiers)) {
      for (let i = 0; i < node.declarationList.declarations.length; i++) {
        const decl = node.declarationList.declarations[i];
        if (!ts.isIdentifier(decl.name)) {
          continue;
        }
        const varName = decl.name.text;
        if (!isPascalCase(varName) || decl.initializer === undefined) {
          continue;
        }
        const matched = matchFromInitializer(varName, decl.initializer, 'function');
        if (matched !== null) {
          candidates.push(matched);
        }
      }
    }

    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const expr = node.expression;
      if (ts.isFunctionExpression(expr) || ts.isArrowFunction(expr)) {
        const fnName = functionNameFromNode(expr) || deriveNameFromPath(sourceFile);
        candidates.push({
          name: fnName,
          kind: 'function',
          node: expr,
          propsParameter: propsParameterFromFunctionLike(expr),
        });
      } else {
        const unwrapped = unwrapForwardRefOrMemo(expr);
        if (unwrapped !== null && (ts.isFunctionExpression(unwrapped.inner) || ts.isArrowFunction(unwrapped.inner))) {
          candidates.push({
            name: deriveNameFromPath(sourceFile),
            kind: unwrapped.kind,
            node: unwrapped.inner,
            propsParameter: propsParameterFromFunctionLike(unwrapped.inner),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return candidates;
}

export function findExportedComponent(sourceFile: ts.SourceFile): ExportedComponentMatch | null {
  const candidates = collectCandidates(sourceFile);
  if (candidates.length === 0) {
    return null;
  }

  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].name === 'Button' || candidates[i].name.endsWith('Button')) {
      return candidates[i];
    }
  }

  const named = candidates.filter(function (c) {
    return c.name !== deriveNameFromPath(sourceFile) || c.kind !== 'function';
  });
  if (named.length === 1) {
    return named[0];
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  for (let i = 0; i < candidates.length; i++) {
    if (isPascalCase(candidates[i].name)) {
      return candidates[i];
    }
  }
  return candidates[0];
}
