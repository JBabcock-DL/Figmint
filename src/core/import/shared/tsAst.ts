import ts from 'typescript';

export interface ParsedImportBinding {
  localName: string;
  moduleSpecifier: string;
  isDefault: boolean;
}

export interface ParsedJsxTag {
  tagName: string;
  line: number;
}

export function createTsxSourceFile(fileName: string, sourceText: string): ts.SourceFile {
  return ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

export function collectImportBindings(sourceFile: ts.SourceFile): ParsedImportBinding[] {
  const bindings: ParsedImportBinding[] = [];

  function visit(node: ts.Node): void {
    if (!ts.isImportDeclaration(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const clause = node.importClause;
    if (clause === undefined) {
      return;
    }
    if (clause.isTypeOnly) {
      return;
    }

    const specNode = node.moduleSpecifier;
    if (!ts.isStringLiteral(specNode)) {
      return;
    }
    const moduleSpecifier = specNode.text;

    if (clause.name !== undefined) {
      bindings.push({
        localName: clause.name.text,
        moduleSpecifier: moduleSpecifier,
        isDefault: true,
      });
    }

    const named = clause.namedBindings;
    if (named === undefined) {
      return;
    }
    if (ts.isNamespaceImport(named)) {
      return;
    }
    if (!ts.isNamedImports(named)) {
      return;
    }

    for (let i = 0; i < named.elements.length; i++) {
      const element = named.elements[i];
      if (element.isTypeOnly) {
        continue;
      }
      const localName = element.name.text;
      bindings.push({
        localName: localName,
        moduleSpecifier: moduleSpecifier,
        isDefault: false,
      });
    }
  }

  ts.forEachChild(sourceFile, visit);
  return bindings;
}

function jsxTagRootName(tagName: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tagName)) {
    return tagName.text;
  }
  if (ts.isPropertyAccessExpression(tagName) && ts.isIdentifier(tagName.expression)) {
    return tagName.expression.text;
  }
  return null;
}

function isComponentTagName(name: string): boolean {
  if (name.length === 0) {
    return false;
  }
  const first = name.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase();
}

export function collectJsxComponentTags(sourceFile: ts.SourceFile): ParsedJsxTag[] {
  const tags: ParsedJsxTag[] = [];

  function recordTag(tagName: ts.JsxTagNameExpression, node: ts.Node): void {
    const name = jsxTagRootName(tagName);
    if (name === null || !isComponentTagName(name)) {
      return;
    }
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    tags.push({ tagName: name, line: line });
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxSelfClosingElement(node)) {
      recordTag(node.tagName, node);
    } else if (ts.isJsxOpeningElement(node)) {
      recordTag(node.tagName, node);
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return tags;
}
