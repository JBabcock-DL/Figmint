import { flags } from '@/config/flags';
import { buildCodeConnectPrBody } from './prBodyCodeConnect';
import { getMappingTemplate } from './registry';
import { resolveStubPath } from './resolveStubPath';
import type { MappingStubFile, UnmappedComponentRef } from './types';
import { executeGithubPRSink, isGithubPREnabled } from '@/io/sinks/githubPR';
import type { SinkResult } from '@/io/sinks/types';

export interface EmitCodeConnectPRContext {
  repoUrl: string;
  specsPath: string;
  figmaFileKey: string;
  figmaFileName: string;
  defaultBranch: string;
  owner: string;
  repo: string;
  framework: 'react';
  components: readonly UnmappedComponentRef[];
}

export const CODE_CONNECT_BATCH_CAP = 25;

export interface EmitCodeConnectPRResult {
  sink: SinkResult;
  stubs: MappingStubFile[];
  truncated: boolean;
}

function buildFigmaFileUrl(figmaFileKey: string, figmaFileName: string): string {
  return (
    'https://www.figma.com/design/' + figmaFileKey + '/' + encodeURIComponent(figmaFileName)
  );
}

function unavailableSink(message: string): SinkResult {
  return {
    ok: false,
    sink: 'github-pr',
    message: message,
    code: 'unavailable',
    error: message,
  };
}

export async function emitCodeConnectPR(
  ctx: EmitCodeConnectPRContext,
): Promise<EmitCodeConnectPRResult> {
  if (!flags.codeConnectPR || !isGithubPREnabled()) {
    return {
      sink: unavailableSink('Code Connect PR requires Org build + GitHub connection.'),
      stubs: [],
      truncated: false,
    };
  }

  let batch = ctx.components;
  let truncated = false;
  if (batch.length > CODE_CONNECT_BATCH_CAP) {
    batch = batch.slice(0, CODE_CONNECT_BATCH_CAP);
    truncated = true;
  }

  const template = getMappingTemplate(ctx.framework);
  if (template === null) {
    return {
      sink: unavailableSink('No mapping template for framework: ' + ctx.framework),
      stubs: [],
      truncated: truncated,
    };
  }

  const stubs: MappingStubFile[] = [];
  for (let i = 0; i < batch.length; i++) {
    const component = batch[i];
    const pathInfo = resolveStubPath({
      specsPath: ctx.specsPath,
      componentKey: component.componentKey,
      componentName: component.name,
    });
    const stub = template.generateStub({
      component: component,
      repoComponentsRoot: ctx.specsPath,
      implementationImportPath: pathInfo.implementationImportPath,
      figmaFileSlug: ctx.figmaFileName,
    });
    stubs.push(stub);
  }

  console.debug('[codeconnect] emitPR', {
    stubCount: stubs.length,
    truncated: truncated,
  });

  const stubPaths: string[] = [];
  for (let s = 0; s < stubs.length; s++) {
    stubPaths.push(stubs[s].relativePath);
  }

  const prBody = buildCodeConnectPrBody({
    stubPaths: stubPaths,
    figmaFileUrl: buildFigmaFileUrl(ctx.figmaFileKey, ctx.figmaFileName),
    pluginVersion: import.meta.env.PACKAGE_VERSION,
  });

  const sink = await executeGithubPRSink({
    files: stubs.map(function (stub) {
      return { path: stub.relativePath, content: stub.content };
    }),
    contractKind: 'code-connect-stubs',
    repoUrl: ctx.repoUrl,
    options: {
      owner: ctx.owner,
      repo: ctx.repo,
      baseBranch: ctx.defaultBranch,
      commitMessage: 'fighub: add Code Connect stubs',
      branchPattern: 'fighub/code-connect-stubs-{date}',
      prTitle: 'fighub: Code Connect stubs',
    },
    figmaFileKey: ctx.figmaFileKey,
    figmaFileName: ctx.figmaFileName,
    prBodyOverride: prBody,
  });

  return {
    sink: sink,
    stubs: stubs,
    truncated: truncated,
  };
}
