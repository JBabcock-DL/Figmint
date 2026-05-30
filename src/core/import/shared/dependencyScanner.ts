import type { DependencyNode, DependencyNodeStatus, DependencyTree } from './types';
import { resolveRegistryKey } from './resolveRegistryKey';
import { collectImportBindings, collectJsxComponentTags, createTsxSourceFile } from './tsAst';

export type UnknownDependencyAction = 'import-first' | 'placeholder' | 'cancel';

export interface DependencyTreePanelProps {
  tree: DependencyTree;
  hasUnknown: boolean;
  hasCircular: boolean;
  onResolveUnknown: (componentName: string, action: UnknownDependencyAction) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export interface ScanDependenciesOptions {
  registryKeys: readonly string[];
  nameToKey?: Readonly<Record<string, string>>;
  /**
   * Optional sibling source texts for same-package relative imports (circular detection).
   * Keys: resolved relative path from sourcePath (posix, no extension).
   */
  siblingSources?: Readonly<Record<string, string>>;
}

function pathKeyFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('.tsx')) {
    return normalized.slice(0, -4);
  }
  if (normalized.endsWith('.ts')) {
    return normalized.slice(0, -3);
  }
  if (normalized.endsWith('.jsx')) {
    return normalized.slice(0, -4);
  }
  if (normalized.endsWith('.js')) {
    return normalized.slice(0, -3);
  }
  return normalized;
}

function dirnamePosix(fileKey: string): string {
  const parts = fileKey.split('/');
  parts.pop();
  return parts.join('/');
}

function resolveRelativeImportKey(fromFilePath: string, moduleSpecifier: string): string {
  const fromKey = pathKeyFromFilePath(fromFilePath);
  const baseDir = dirnamePosix(fromKey);
  const segments = baseDir.length === 0 ? [] : baseDir.split('/');

  const specParts = moduleSpecifier.split('/');
  for (let i = 0; i < specParts.length; i++) {
    const part = specParts[i];
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      if (segments.length > 0) {
        segments.pop();
      }
      continue;
    }
    segments.push(part);
  }

  return segments.join('/');
}

function isRelativeSpecifier(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function hasCycleInSiblingGraph(
  rootKey: string,
  startKey: string,
  siblingSources: Readonly<Record<string, string>>,
  visiting: Record<string, boolean>,
): boolean {
  if (startKey === rootKey) {
    return true;
  }
  if (visiting[startKey]) {
    return true;
  }

  const siblingText = siblingSources[startKey];
  if (siblingText === undefined) {
    return false;
  }

  visiting[startKey] = true;
  const siblingFile = startKey + '.tsx';
  const sourceFile = createTsxSourceFile(siblingFile, siblingText);
  const bindings = collectImportBindings(sourceFile);

  for (let i = 0; i < bindings.length; i++) {
    const spec = bindings[i].moduleSpecifier;
    if (!isRelativeSpecifier(spec)) {
      continue;
    }
    const nextKey = resolveRelativeImportKey(siblingFile, spec);
    if (hasCycleInSiblingGraph(rootKey, nextKey, siblingSources, visiting)) {
      return true;
    }
  }

  return false;
}

function isCircularDependency(
  sourcePath: string,
  importPath: string,
  siblingSources: Readonly<Record<string, string>> | undefined,
): boolean {
  if (!isRelativeSpecifier(importPath)) {
    return false;
  }

  const rootKey = pathKeyFromFilePath(sourcePath);
  const targetKey = resolveRelativeImportKey(sourcePath, importPath);

  if (targetKey === rootKey) {
    return true;
  }

  if (siblingSources === undefined) {
    return false;
  }

  const visiting: Record<string, boolean> = {};
  return hasCycleInSiblingGraph(rootKey, targetKey, siblingSources, visiting);
}

function resolveNodeStatus(
  tagName: string,
  importPath: string,
  sourcePath: string,
  options: ScanDependenciesOptions,
): DependencyNodeStatus {
  if (importPath !== '' && isCircularDependency(sourcePath, importPath, options.siblingSources)) {
    return 'circular';
  }

  const registryHit = resolveRegistryKey(tagName, options.registryKeys, options.nameToKey);
  if (registryHit !== null) {
    return 'registered';
  }

  return 'unknown';
}

/** True when any node has status `unknown` (WO-044 gating). */
export function treeHasUnknown(tree: DependencyTree): boolean {
  for (let i = 0; i < tree.nodes.length; i++) {
    if (tree.nodes[i].status === 'unknown') {
      return true;
    }
  }
  return false;
}

/** True when any node has status `circular` (WO-044 gating). */
export function treeHasCircular(tree: DependencyTree): boolean {
  for (let i = 0; i < tree.nodes.length; i++) {
    if (tree.nodes[i].status === 'circular') {
      return true;
    }
  }
  return false;
}

export function scanDependencies(
  sourceText: string,
  sourcePath: string,
  options: ScanDependenciesOptions,
): DependencyTree {
  const sourceFile = createTsxSourceFile(sourcePath, sourceText);
  const importBindings = collectImportBindings(sourceFile);
  const importByLocal: Record<string, string> = {};

  for (let b = 0; b < importBindings.length; b++) {
    importByLocal[importBindings[b].localName] = importBindings[b].moduleSpecifier;
  }

  const jsxTags = collectJsxComponentTags(sourceFile);
  const seenTags: Record<string, boolean> = {};
  const nodes: DependencyNode[] = [];
  let registered = 0;
  let unknown = 0;
  let circular = 0;

  for (let t = 0; t < jsxTags.length; t++) {
    const tag = jsxTags[t];
    if (seenTags[tag.tagName]) {
      continue;
    }
    seenTags[tag.tagName] = true;

    let importPath = importByLocal[tag.tagName];
    if (importPath === undefined) {
      importPath = '';
    }

    const status = resolveNodeStatus(tag.tagName, importPath, sourcePath, options);
    if (status === 'registered') {
      registered = registered + 1;
    } else if (status === 'unknown') {
      unknown = unknown + 1;
    } else if (status === 'circular') {
      circular = circular + 1;
    }

    nodes.push({
      name: tag.tagName,
      importPath: importPath,
      status: status,
      children: [],
    });
  }

  console.debug('[import/scan]', {
    sourcePath: sourcePath,
    nodeCount: nodes.length,
    registered: registered,
    unknown: unknown,
    circular: circular,
  });

  return {
    rootImportPath: sourcePath,
    nodes: nodes,
  };
}
