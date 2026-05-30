import { flags } from '@/config/flags';
import { detectUnmapped } from '@/core/codeconnect/detectUnmapped';
import { emitCodeConnectPR } from '@/core/codeconnect/emitCodeConnectPR';
import { collectUnmappedCandidates } from '@/core/codeconnect/figmaComponentReader';
import type { UnmappedComponentRef as CoreUnmappedRef } from '@/core/codeconnect/types';
import { pluginLog } from '@/core/pluginLog';
import { normalizeRepoUrl, parseOwnerRepo } from '@/io/github/repoUrl';
import { getSyncState, getToken } from '@/io/github/storage';
import type {
  CodeConnectDetectMessage,
  CodeConnectDetectResultMessage,
  CodeConnectEmitPRRequest,
  CodeConnectEmitPRResult,
  CodeConnectEmitPrMessage,
  CodeConnectEmitPrResultMessage,
  UnmappedComponentRef,
} from '@/io/messages/codeconnect';
import {
  CODECONNECT_DETECT_RESULT,
  CODECONNECT_EMIT_PR_RESULT,
  CODECONNECT_EMIT_PR_UI_RESULT,
} from '@/io/messages/codeconnect';
import { listRepoPathsForRepo } from '@/io/github/listRepoPaths';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function mapToUiRef(ref: CoreUnmappedRef): UnmappedComponentRef {
  return {
    nodeId: ref.nodeId,
    name: ref.name,
    implementationPath: ref.componentKey,
  };
}

export async function listRepoPathsForDetect(repoUrl: string): Promise<readonly string[]> {
  return listRepoPathsForRepo(repoUrl);
}

async function resolveRepoContext(repoUrl: string): Promise<{
  normalized: string;
  token: string;
  owner: string;
  repo: string;
  specsPath: string;
  defaultBranch: string;
} | null> {
  const normalized = normalizeRepoUrl(repoUrl);
  const stored = await getToken(normalized);
  if (stored === null) {
    return null;
  }
  const syncState = await getSyncState(normalized);
  const ownerRepo = parseOwnerRepo(normalized);
  const specsPath =
    syncState !== null &&
    syncState.resolvedConfig !== null &&
    syncState.resolvedConfig.specsPath.length > 0
      ? syncState.resolvedConfig.specsPath
      : 'components/';
  const defaultBranch =
    syncState !== null &&
    syncState.resolvedConfig !== null &&
    syncState.resolvedConfig.designSystemBranch.length > 0
      ? syncState.resolvedConfig.designSystemBranch
      : syncState !== null && syncState.defaultBranch.length > 0
        ? syncState.defaultBranch
        : 'main';
  return {
    normalized: normalized,
    token: stored.accessToken,
    owner: ownerRepo.owner,
    repo: ownerRepo.repo,
    specsPath: specsPath,
    defaultBranch: defaultBranch,
  };
}

export async function handleCodeConnectDetect(
  message: CodeConnectDetectMessage,
): Promise<void> {
  const post = function (result: CodeConnectDetectResultMessage): void {
    figma.ui.postMessage(result);
  };

  try {
    const ctx = await resolveRepoContext(message.repoUrl);
    if (ctx === null) {
      post({
        type: CODECONNECT_DETECT_RESULT,
        requestId: message.requestId,
        ok: false,
        unmapped: [],
        error: 'GitHub is not connected for this repository.',
      });
      return;
    }

    const figmaFileKey =
      figma.fileKey !== undefined && figma.fileKey.length > 0 ? figma.fileKey : '';

    const detectResult = await detectUnmapped(
      {
        repoUrl: message.repoUrl,
        specsPath: ctx.specsPath,
        figmaFileKey: figmaFileKey,
        selectedNodeIds: message.nodeIds,
        framework: 'react',
      },
      {
        listRepoPaths: listRepoPathsForDetect,
        listFigmaComponents: async function (detectCtx) {
          return collectUnmappedCandidates(detectCtx.selectedNodeIds);
        },
      },
    );

    const unmapped = detectResult.unmapped.map(mapToUiRef);
    console.debug('[main] codeconnect/detect', { count: unmapped.length });
    post({
      type: CODECONNECT_DETECT_RESULT,
      requestId: message.requestId,
      ok: true,
      unmapped: unmapped,
    });
  } catch (error) {
    post({
      type: CODECONNECT_DETECT_RESULT,
      requestId: message.requestId,
      ok: false,
      unmapped: [],
      error: extractErrorMessage(error),
    });
  }
}

export async function handleCodeConnectEmitPr(
  message: CodeConnectEmitPrMessage,
): Promise<void> {
  const post = function (result: CodeConnectEmitPrResultMessage): void {
    figma.ui.postMessage(result);
  };

  if (!flags.codeConnectPR) {
    post({
      type: CODECONNECT_EMIT_PR_UI_RESULT,
      requestId: message.requestId,
      ok: false,
      error: 'Code Connect PR is disabled for this build.',
      code: 'unavailable',
    });
    return;
  }

  try {
    const ctx = await resolveRepoContext(message.repoUrl);
    if (ctx === null) {
      post({
        type: CODECONNECT_EMIT_PR_UI_RESULT,
        requestId: message.requestId,
        ok: false,
        error: 'GitHub is not connected for this repository.',
        code: 'auth-required',
      });
      return;
    }

    const figmaFileKey =
      figma.fileKey !== undefined && figma.fileKey.length > 0 ? figma.fileKey : '';
    const figmaFileName =
      figma.root !== undefined && figma.root.name.length > 0 ? figma.root.name : 'file';

    const detectResult = await detectUnmapped(
      {
        repoUrl: message.repoUrl,
        specsPath: ctx.specsPath,
        figmaFileKey: figmaFileKey,
        selectedNodeIds: message.componentIds,
        framework: 'react',
      },
      {
        listRepoPaths: listRepoPathsForDetect,
        listFigmaComponents: async function (detectCtx) {
          return collectUnmappedCandidates(detectCtx.selectedNodeIds);
        },
      },
    );

    if (detectResult.unmapped.length === 0) {
      post({
        type: CODECONNECT_EMIT_PR_UI_RESULT,
        requestId: message.requestId,
        ok: false,
        error: 'All selected components already have Code Connect stubs.',
        code: 'unavailable',
      });
      return;
    }

    const emitResult = await emitCodeConnectPR({
      repoUrl: message.repoUrl,
      specsPath: ctx.specsPath,
      figmaFileKey: figmaFileKey,
      figmaFileName: figmaFileName,
      defaultBranch: ctx.defaultBranch,
      owner: ctx.owner,
      repo: ctx.repo,
      framework: 'react',
      components: detectResult.unmapped,
    });

    let prUrl: string | undefined;
    if (emitResult.sink.ok && emitResult.sink.artifacts !== undefined) {
      for (let i = 0; i < emitResult.sink.artifacts.length; i++) {
        const artifact = emitResult.sink.artifacts[i];
        if (artifact.destination !== undefined && artifact.destination.length > 0) {
          prUrl = artifact.destination;
          break;
        }
      }
    }

    console.debug('[main] codeconnect/emit-pr', {
      stubCount: emitResult.stubs.length,
      prUrl: prUrl !== undefined ? prUrl : '',
    });

    if (!emitResult.sink.ok) {
      post({
        type: CODECONNECT_EMIT_PR_UI_RESULT,
        requestId: message.requestId,
        ok: false,
        error: emitResult.sink.message,
        code: emitResult.sink.code,
      });
      return;
    }

    post({
      type: CODECONNECT_EMIT_PR_UI_RESULT,
      requestId: message.requestId,
      ok: true,
      prUrl: prUrl,
    });
  } catch (error) {
    post({
      type: CODECONNECT_EMIT_PR_UI_RESULT,
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
      code: 'unavailable',
    });
  }
}

export async function handleCodeConnectEmitPR(
  req: CodeConnectEmitPRRequest,
): Promise<CodeConnectEmitPRResult> {
  const figmaFileKey =
    figma.fileKey !== undefined && figma.fileKey.length > 0 ? figma.fileKey : '';
  const figmaFileName =
    figma.root !== undefined && figma.root.name.length > 0 ? figma.root.name : 'file';

  const detectResult = await detectUnmapped(
    {
      repoUrl: req.repoUrl,
      specsPath: req.specsPath,
      figmaFileKey: figmaFileKey,
      selectedNodeIds: req.selectedNodeIds,
      framework: req.framework,
    },
    {
      listRepoPaths: listRepoPathsForDetect,
      listFigmaComponents: async function (ctx) {
        return collectUnmappedCandidates(ctx.selectedNodeIds);
      },
    },
  );

  if (detectResult.unmapped.length === 0) {
    return {
      type: CODECONNECT_EMIT_PR_RESULT,
      ok: false,
      message: 'All selected components already have Code Connect stubs.',
    };
  }

  const emitResult = await emitCodeConnectPR({
    repoUrl: req.repoUrl,
    specsPath: req.specsPath,
    figmaFileKey: figmaFileKey,
    figmaFileName: figmaFileName,
    defaultBranch: req.defaultBranch,
    owner: req.owner,
    repo: req.repo,
    framework: req.framework,
    components: detectResult.unmapped,
  });

  let prUrl: string | undefined;
  if (emitResult.sink.ok && emitResult.sink.artifacts !== undefined) {
    for (let i = 0; i < emitResult.sink.artifacts.length; i++) {
      const artifact = emitResult.sink.artifacts[i];
      if (artifact.destination !== undefined && artifact.destination.length > 0) {
        prUrl = artifact.destination;
        break;
      }
    }
  }

  pluginLog('codeconnect:emit-pr', {
    stubCount: emitResult.stubs.length,
    prUrl: prUrl !== undefined ? prUrl : '',
  });

  if (!emitResult.sink.ok) {
    return {
      type: CODECONNECT_EMIT_PR_RESULT,
      ok: false,
      code: emitResult.sink.code,
      message: emitResult.sink.message,
    };
  }

  return {
    type: CODECONNECT_EMIT_PR_RESULT,
    ok: true,
    prUrl: prUrl,
    stubCount: emitResult.stubs.length,
    truncated: emitResult.truncated,
  };
}
