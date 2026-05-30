/**
 * Shared import types (WO-039).
 * Binding `variable` paths use slash-separated canonical paths without collection prefix,
 * e.g. `color/primary/default` (see tests/fixtures/component-spec-button-canonical.json).
 */

export type TokenResolveResult =
  | { ok: true; variable: string }
  | { ok: false; reason: 'unresolved' | 'ambiguous' };

export interface TokenResolver {
  resolve(token: string): TokenResolveResult;
}

export type DependencyNodeStatus = 'registered' | 'unknown' | 'circular';

export interface DependencyNode {
  name: string;
  importPath: string;
  status: DependencyNodeStatus;
  children: DependencyNode[];
}

export interface DependencyTree {
  rootImportPath: string;
  nodes: DependencyNode[];
}
