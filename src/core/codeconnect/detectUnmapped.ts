import { resolveStubPath } from './resolveStubPath';
import type { UnmappedComponentRef } from './types';

export interface DetectUnmappedContext {
  repoUrl: string;
  specsPath: string;
  figmaFileKey: string;
  /** Optional — when set, only scan these node ids; else scan current page */
  selectedNodeIds?: readonly string[];
  framework: 'react';
}

export interface DetectUnmappedDeps {
  /** Returns normalized repo-relative paths (forward slashes) */
  listRepoPaths(repoUrl: string): Promise<readonly string[]>;
  /** Read Figma component candidates from canvas */
  listFigmaComponents(ctx: DetectUnmappedContext): Promise<readonly UnmappedComponentRef[]>;
}

export interface DetectUnmappedResult {
  unmapped: UnmappedComponentRef[];
  skippedMapped: number;
  skippedNoProps: number;
}

function isFigmaConnectStubPath(path: string): boolean {
  return path.endsWith('.figma.tsx');
}

function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function repoHasPath(repoPaths: readonly string[], targetPath: string): boolean {
  const normalizedTarget = normalizeRepoPath(targetPath);
  for (let i = 0; i < repoPaths.length; i++) {
    if (normalizeRepoPath(repoPaths[i]) === normalizedTarget) {
      return true;
    }
  }
  return false;
}

export async function detectUnmapped(
  ctx: DetectUnmappedContext,
  deps: DetectUnmappedDeps,
): Promise<DetectUnmappedResult> {
  const allRepoPaths = await deps.listRepoPaths(ctx.repoUrl);
  const figmaStubPaths: string[] = [];

  for (let i = 0; i < allRepoPaths.length; i++) {
    const path = normalizeRepoPath(allRepoPaths[i]);
    if (isFigmaConnectStubPath(path)) {
      figmaStubPaths.push(path);
    }
  }

  const candidates = await deps.listFigmaComponents(ctx);
  const unmapped: UnmappedComponentRef[] = [];
  let skippedMapped = 0;
  let skippedNoProps = 0;

  for (let c = 0; c < candidates.length; c++) {
    const candidate = candidates[c];
    const propKeys = Object.keys(candidate.componentProperties);
    if (propKeys.length === 0) {
      skippedNoProps = skippedNoProps + 1;
      continue;
    }

    const stubPath = resolveStubPath({
      specsPath: ctx.specsPath,
      componentKey: candidate.componentKey,
      componentName: candidate.name,
    });

    if (repoHasPath(figmaStubPaths, stubPath.relativePath)) {
      skippedMapped = skippedMapped + 1;
      continue;
    }

    unmapped.push(candidate);
  }

  console.debug('[codeconnect] detectUnmapped', {
    candidate: candidates.length,
    unmapped: unmapped.length,
    skippedMapped: skippedMapped,
  });

  return {
    unmapped: unmapped,
    skippedMapped: skippedMapped,
    skippedNoProps: skippedNoProps,
  };
}
