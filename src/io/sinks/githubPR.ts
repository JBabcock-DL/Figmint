import { flags } from '@/config/flags';
import { createPullRequestFromSinkContext } from '@/io/github/createPullRequestFlow';
import { GitHubFlowError, mapNetworkError } from '@/io/github/githubErrors';
import { buildPrBody } from '@/io/github/prBody';
import { normalizeRepoUrl } from '@/io/github/repoUrl';
import { clearToken, getToken } from '@/io/github/storage';
import type { GithubPRSinkContext, SinkResult } from './types';

export function isGithubPREnabled(): boolean {
  return flags.githubOAuth === true && flags.githubPRSink === true;
}

function inferFileFormat(path: string): 'json' | 'md' {
  if (path.length >= 3 && path.slice(-3) === '.md') {
    return 'md';
  }
  return 'json';
}

function buildFigmaFileUrl(figmaFileKey: string, figmaFileName: string): string {
  return (
    'https://www.figma.com/design/' + figmaFileKey + '/' + encodeURIComponent(figmaFileName)
  );
}

export async function executeGithubPRSink(ctx: GithubPRSinkContext): Promise<SinkResult> {
  if (!isGithubPREnabled()) {
    return {
      ok: false,
      sink: 'github-pr',
      message: 'GitHub PR export is not available.',
      code: 'unavailable',
      error: 'Feature disabled for this build.',
    };
  }

  let repoUrl: string;
  try {
    repoUrl = normalizeRepoUrl(ctx.repoUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      sink: 'github-pr',
      message: 'Invalid repository URL.',
      error: message,
      code: 'not-found',
    };
  }

  const stored = await getToken(repoUrl);
  if (stored === null) {
    return {
      ok: false,
      sink: 'github-pr',
      message: 'Connect GitHub in Settings to open a PR.',
      code: 'auth-required',
      error: 'GitHub is not connected for this repository.',
    };
  }

  const prBody = buildPrBody({
    commitMessage: ctx.options.commitMessage,
    files: ctx.files.map(function (file) {
      return {
        path: file.path,
        format: inferFileFormat(file.path),
      };
    }),
    pluginVersion: import.meta.env.PACKAGE_VERSION,
    figmaFileUrl: buildFigmaFileUrl(ctx.figmaFileKey, ctx.figmaFileName),
    figmaFileName: ctx.figmaFileName,
    contractKind: ctx.contractKind,
  });

  try {
    const result = await createPullRequestFromSinkContext(stored.accessToken, ctx, {
      prBody: prBody,
    });

    return {
      ok: true,
      sink: 'github-pr',
      message: 'Opened PR #' + String(result.prNumber),
      artifacts: [
        {
          format: 'json',
          byteLength: 0,
          destination: result.prUrl,
        },
      ],
    };
  } catch (error) {
    if (error instanceof GitHubFlowError) {
      if (error.mapped.clearToken === true) {
        await clearToken(repoUrl);
      }
      return {
        ok: false,
        sink: 'github-pr',
        message: error.mapped.message,
        error:
          error.mapped.hint !== undefined ? error.mapped.hint : error.mapped.message,
        code: error.mapped.code,
      };
    }

    const mapped = mapNetworkError(error);
    return {
      ok: false,
      sink: 'github-pr',
      message: mapped.message,
      error: mapped.hint !== undefined ? mapped.hint : mapped.message,
      code: mapped.code,
    };
  }
}
