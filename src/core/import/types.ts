import type { ComponentFramework, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import type { DependencyTree } from './shared/types';
import type { TokenResolver } from './shared/tokenResolver';

export interface ImportTemplateContext {
  sourcePath: string;
  sourceText: string;
  figmaMappingText?: string;
  tokenResolver: TokenResolver;
  registryKeys: readonly string[];
}

export interface ImportParseIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ImportTemplateResult {
  spec: ComponentSpecV1;
  dependencyTree: DependencyTree;
  issues: ImportParseIssue[];
}

export interface ImportTemplate {
  readonly framework: ComponentFramework;
  parse(ctx: ImportTemplateContext): ImportTemplateResult;
}
