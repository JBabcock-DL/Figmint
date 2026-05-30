import type { ComponentSpecLayout, ComponentSpecConfidenceLevel } from '@detroitlabs/fighub-contracts';
import ts from 'typescript';

import type { ExportedComponentMatch } from './findExportedComponent';
import { splitClassString } from './parseCvaVariants';

export interface LayoutInferenceResult {
  layout: ComponentSpecLayout;
  confidence: ComponentSpecConfidenceLevel;
  ambiguousTokens: string[];
}

const TAILWIND_SPACING: Record<string, string> = {
  '0': '0',
  '0.5': '2',
  '1': '4',
  '1.5': '6',
  '2': '8',
  '2.5': '10',
  '3': '12',
  '3.5': '14',
  '4': '16',
  '5': '20',
  '6': '24',
  '8': '32',
};

function spacingToPx(token: string): string | null {
  const match = /^(?:gap|p|px|py|pt|pb|pl|pr)-(.+)$/.exec(token);
  if (match === null) {
    return null;
  }
  const scale = match[1];
  if (TAILWIND_SPACING[scale] !== undefined) {
    return TAILWIND_SPACING[scale];
  }
  if (/^\d+px$/.test(scale)) {
    return scale.replace('px', '');
  }
  return null;
}

function collectRootClassTokens(match: ExportedComponentMatch, classTokens: string[]): string[] {
  if (classTokens.length > 0) {
    return classTokens;
  }
  const tokens: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      for (let i = 0; i < node.attributes.properties.length; i++) {
        const attr = node.attributes.properties[i];
        if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name) || attr.name.text !== 'className') {
          continue;
        }
        if (attr.initializer !== undefined && ts.isStringLiteral(attr.initializer)) {
          const parts = splitClassString(attr.initializer.text);
          for (let p = 0; p < parts.length; p++) {
            tokens.push(parts[p]);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  const node = match.node;
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    if (node.body !== undefined) {
      ts.forEachChild(node.body, visit);
    }
  }
  return tokens;
}

export function inferLayoutFromRootJsx(
  match: ExportedComponentMatch,
  _sourceFile: ts.SourceFile,
  classTokens: string[],
): LayoutInferenceResult {
  const tokens = collectRootClassTokens(match, classTokens);
  const ambiguousTokens: string[] = [];

  let hasRow = false;
  let hasCol = false;
  let gap: string | undefined;
  let padding: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'inline-flex' || token === 'flex') {
      hasRow = true;
    }
    if (token === 'flex-col' || token === 'flex-col-reverse') {
      hasCol = true;
      hasRow = false;
    }
    if (token === 'flex-row' || token === 'flex-row-reverse') {
      hasRow = true;
      hasCol = false;
    }
    const gapVal = spacingToPx(token.startsWith('gap-') ? token : '');
    if (gapVal !== null && token.startsWith('gap-')) {
      gap = gapVal;
    }
    if (token.startsWith('px-') || token.startsWith('p-')) {
      const padVal = spacingToPx(token);
      if (padVal !== null) {
        padding = padVal;
      }
    }
  }

  if (hasRow && hasCol) {
    ambiguousTokens.push('flex-direction-conflict');
  }

  const direction = hasCol ? 'vertical' : 'horizontal';
  let confidence: ComponentSpecConfidenceLevel = 'high';
  if (ambiguousTokens.length > 0) {
    confidence = 'low';
  } else if (tokens.length === 0) {
    confidence = 'low';
  } else if (gap === undefined || padding === undefined) {
    confidence = 'medium';
  }

  return {
    layout: {
      direction: direction,
      gap: gap !== undefined ? gap : '8',
      padding: padding,
      sizing: { horizontal: 'hug', vertical: 'hug' },
    },
    confidence: confidence,
    ambiguousTokens: ambiguousTokens,
  };
}
