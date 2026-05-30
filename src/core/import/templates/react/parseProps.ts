import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';
import ts from 'typescript';

import { buildVariantMatrix } from './buildVariantMatrix';
import type { ExportedComponentMatch } from './findExportedComponent';
import { mapPropsInterface, mapTsTypeToSpecProp } from './propTypeMapper';
import type { CvaVariantMap } from './types';

function findInterfaceBySuffix(sourceFile: ts.SourceFile, suffix: string): ts.InterfaceDeclaration | null {
  let found: ts.InterfaceDeclaration | null = null;
  function visit(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node) && node.name.text.endsWith(suffix)) {
      found = node;
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sourceFile, visit);
  return found;
}

function cvaEnumsFromMap(cvaMap: CvaVariantMap | null): Record<string, string[]> | undefined {
  if (cvaMap === null) {
    return undefined;
  }
  return cvaMap.axes;
}

function visitComponentBody(match: ExportedComponentMatch, visit: (node: ts.Node) => void): void {
  const node = match.node;
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    if (node.body !== undefined) {
      ts.forEachChild(node.body, visit);
    }
  }
}

function parseDestructuredProps(
  match: ExportedComponentMatch,
  cvaEnums?: Record<string, string[]>,
): ComponentSpecProp[] {
  const param = match.propsParameter;
  if (param === undefined || param.name === undefined || !ts.isObjectBindingPattern(param.name)) {
    return [];
  }
  const props: ComponentSpecProp[] = [];
  const defaults: Record<string, ts.Expression> = {};
  for (let i = 0; i < param.name.elements.length; i++) {
    const element: ts.BindingElement = param.name.elements[i];
    if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) {
      continue;
    }
    const propName = element.name.text;
    if (propName === 'props' || propName === 'children') {
      continue;
    }
    if (element.initializer !== undefined) {
      defaults[propName] = element.initializer;
    }
    const mapped = mapTsTypeToSpecProp(propName, undefined, defaults[propName], cvaEnums);
    if (mapped !== null) {
      props.push(mapped);
    }
  }
  return props;
}

function detectComponentPropsFlags(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
): { componentProps?: Record<string, boolean>; iconSlots?: { leading: boolean; trailing: boolean } } {
  let hasTextChild = false;
  let hasLeadingIcon = false;

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
      if (ts.isIdentifier(tagName)) {
        const name = tagName.text;
        if (name === 'Loader2' || name.endsWith('Icon')) {
          hasLeadingIcon = true;
        }
      }
    }
    if (ts.isJsxExpression(node) && node.expression !== undefined) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr.expression) && expr.expression.text === 'props' && expr.name.text === 'children') {
          hasTextChild = true;
        }
      }
    }
    if (ts.isJsxText(node) && node.text.trim().length > 0) {
      hasTextChild = true;
    }
    ts.forEachChild(node, visit);
  }

  visitComponentBody(match, visit);

  const sourceText = sourceFile.getFullText();
  if (sourceText.includes('Loader2')) {
    hasLeadingIcon = true;
  }
  if (sourceText.includes('props.children') || sourceText.includes('{children}')) {
    hasTextChild = true;
  }

  if (!hasTextChild && !hasLeadingIcon) {
    return {};
  }

  return {
    componentProps: {
      label: hasTextChild,
      leadingIcon: hasLeadingIcon || hasTextChild,
      trailingIcon: hasLeadingIcon || hasTextChild,
    },
    iconSlots: {
      leading: hasLeadingIcon || hasTextChild,
      trailing: hasLeadingIcon || hasTextChild,
    },
  };
}

const CANONICAL_PROP_ORDER = [
  'variant',
  'size',
  'disabled',
  'asChild',
  'type',
  'className',
  'loading',
];

function sortPropsCanonical(props: ComponentSpecProp[]): ComponentSpecProp[] {
  return props.slice().sort(function (a, b) {
    const ai = CANONICAL_PROP_ORDER.indexOf(a.name);
    const bi = CANONICAL_PROP_ORDER.indexOf(b.name);
    const aRank = ai >= 0 ? ai : CANONICAL_PROP_ORDER.length;
    const bRank = bi >= 0 ? bi : CANONICAL_PROP_ORDER.length;
    return aRank - bRank;
  });
}

function applyCvaDefaults(
  props: ComponentSpecProp[],
  cvaMap: CvaVariantMap | null,
): ComponentSpecProp[] {
  if (cvaMap === null || cvaMap.defaults === undefined) {
    return props;
  }
  return props.map(function (prop) {
    if (prop.type !== 'enum') {
      return prop;
    }
    const cvaDefault = cvaMap.defaults![prop.name];
    if (cvaDefault !== undefined) {
      return Object.assign({}, prop, { default: cvaDefault });
    }
    return prop;
  });
}
export function parsePropsFromComponent(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
  cvaMap: CvaVariantMap | null,
): {
  props: ComponentSpecProp[];
  variantMatrix: Record<string, string[]>;
  componentProps?: Record<string, boolean>;
  iconSlots?: { leading: boolean; trailing: boolean };
} {
  const cvaEnums = cvaEnumsFromMap(cvaMap);
  const propsInterface = findInterfaceBySuffix(sourceFile, 'Props');
  let props: ComponentSpecProp[] = [];

  if (propsInterface !== null) {
    props = mapPropsInterface(propsInterface.members, cvaEnums);
  }

  const destructured = parseDestructuredProps(match, cvaEnums);
  if (destructured.length > 0) {
    for (let i = 0; i < destructured.length; i++) {
      const dProp = destructured[i];
      const existingIdx = props.findIndex(function (p) {
        return p.name === dProp.name;
      });
      if (existingIdx >= 0) {
        if (destructured[i].default !== undefined) {
          props[existingIdx].default = dProp.default;
        }
      } else {
        props.push(dProp);
      }
    }
  } else if (props.length === 0) {
    props = destructured;
  }

  const param = match.propsParameter;
  if (param !== undefined && param.name !== undefined && ts.isObjectBindingPattern(param.name)) {
    for (let i = 0; i < param.name.elements.length; i++) {
      const element: ts.BindingElement = param.name.elements[i];
      if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) {
        continue;
      }
      const propName = element.name.text;
      if (propName === 'props' || propName === 'children') {
        continue;
      }
      const existing = props.find(function (p) {
        return p.name === propName;
      });
      if (existing !== undefined && element.initializer !== undefined) {
        if (existing.type === 'boolean') {
          existing.default = element.initializer.kind === ts.SyntaxKind.TrueKeyword;
        } else if (existing.type === 'string' && ts.isStringLiteral(element.initializer)) {
          existing.default = element.initializer.text;
        } else if (existing.type === 'enum' && ts.isStringLiteral(element.initializer)) {
          existing.default = element.initializer.text;
        }
      }
      if (existing === undefined) {
        const mapped = mapTsTypeToSpecProp(propName, undefined, element.initializer, cvaEnums);
        if (mapped !== null) {
          props.push(mapped);
        }
      }
    }
  }

  props = applyCvaDefaults(sortPropsCanonical(props), cvaMap);

  const variantMatrix = buildVariantMatrix(props, cvaMap !== null ? cvaMap.axes : null);
  const flags = detectComponentPropsFlags(match, sourceFile);

  return {
    props: props,
    variantMatrix: variantMatrix,
    componentProps: flags.componentProps,
    iconSlots: flags.iconSlots,
  };
}
