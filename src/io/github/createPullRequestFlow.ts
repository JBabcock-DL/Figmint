import {
  DEFAULT_BRANCH_PATTERN,
  MAX_BRANCH_ATTEMPTS,
  buildDefaultHeadBranch,
  formatBranchPattern,
  withCollisionSuffix,
} from '@/io/github/branchName';
import {
  GitHubFlowError,
  isReferenceAlreadyExists,
  mapGitHubHttpError,
} from '@/io/github/githubErrors';
import { githubApiViaRelay, type GitHubRelayApiResponse } from '@/io/github/relayClient';
import type { GithubPRSinkContext } from '@/io/sinks/types';

export interface PullRequestFile {
  path: string;
  content: string;
}

export interface CreatePullRequestOptions {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  files: PullRequestFile[];
}

export interface CreatePullRequestResult {
  prUrl: string;
  prNumber: number;
  headBranch: string;
}

export interface CreatePullRequestFromContextInput {
  prBody: string;
  prTitle?: string;
  dateUtc?: Date;
}

function readStringField(body: unknown, field: string): string {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub API response.');
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('GitHub API response missing ' + field + '.');
  }
  return value;
}

function readNestedStringField(body: unknown, parentField: string, field: string): string {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub API response.');
  }
  const parent = (body as Record<string, unknown>)[parentField];
  return readStringField(parent, field);
}

function readNumberField(body: unknown, field: string): number {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid GitHub API response.');
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'number') {
    throw new Error('GitHub API response missing ' + field + '.');
  }
  return value;
}

function throwMappedHttpError(
  response: GitHubRelayApiResponse,
  context: { branch?: string } = {},
): never {
  throw new GitHubFlowError(
    mapGitHubHttpError(response.status, response.body, context),
    response.status,
  );
}

function assertOk(response: GitHubRelayApiResponse, context: { branch?: string } = {}): void {
  if (!response.ok) {
    throwMappedHttpError(response, context);
  }
}

async function githubGetWithRetry(path: string, token: string): Promise<GitHubRelayApiResponse> {
  let response = await githubApiViaRelay('GET', path, token);
  if (!response.ok && response.status >= 500) {
    response = await githubApiViaRelay('GET', path, token);
  }
  return response;
}

function formatDateUtc(dateUtc: Date): string {
  const year = dateUtc.getUTCFullYear();
  const month = String(dateUtc.getUTCMonth() + 1);
  const day = String(dateUtc.getUTCDate());
  const monthPadded = month.length === 1 ? '0' + month : month;
  const dayPadded = day.length === 1 ? '0' + day : day;
  return String(year) + '-' + monthPadded + '-' + dayPadded;
}

export function resolveBaseHeadBranch(ctx: GithubPRSinkContext, dateUtc: Date): string {
  if (ctx.options.headBranch !== undefined && ctx.options.headBranch.length > 0) {
    return ctx.options.headBranch;
  }
  const pattern = ctx.options.branchPattern ?? DEFAULT_BRANCH_PATTERN;
  if (pattern === DEFAULT_BRANCH_PATTERN) {
    return buildDefaultHeadBranch(ctx.contractKind, dateUtc);
  }
  return formatBranchPattern(pattern, ctx.contractKind, formatDateUtc(dateUtc));
}

async function createHeadBranchWithCollision(
  repoPath: string,
  token: string,
  baseSha: string,
  baseHeadBranch: string,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_BRANCH_ATTEMPTS; attempt++) {
    const headBranch = withCollisionSuffix(baseHeadBranch, attempt);
    const response = await githubApiViaRelay('POST', repoPath + '/git/refs', token, {
      ref: 'refs/heads/' + headBranch,
      sha: baseSha,
    });

    if (response.ok) {
      return headBranch;
    }

    if (response.status === 422 && isReferenceAlreadyExists(response.body)) {
      if (attempt === MAX_BRANCH_ATTEMPTS - 1) {
        throwMappedHttpError(response, { branch: headBranch });
      }
      continue;
    }

    throwMappedHttpError(response, { branch: headBranch });
  }

  throw new Error('Head branch creation failed after collision retries.');
}

export async function createPullRequestFromSinkContext(
  token: string,
  ctx: GithubPRSinkContext,
  input: CreatePullRequestFromContextInput,
): Promise<CreatePullRequestResult> {
  const dateUtc = input.dateUtc ?? new Date();
  const headBranch = resolveBaseHeadBranch(ctx, dateUtc);
  const prTitle =
    input.prTitle ??
    ctx.options.prTitle ??
    'fighub: ' + ctx.contractKind + ' export (' + formatDateUtc(dateUtc) + ')';

  return createPullRequestFlow({
    token: token,
    owner: ctx.options.owner,
    repo: ctx.options.repo,
    baseBranch: ctx.options.baseBranch,
    headBranch: headBranch,
    commitMessage: ctx.options.commitMessage,
    prTitle: prTitle,
    prBody: input.prBody,
    files: ctx.files,
  });
}

export async function createPullRequestFlow(
  opts: CreatePullRequestOptions,
): Promise<CreatePullRequestResult> {
  const repoPath = '/repos/' + opts.owner + '/' + opts.repo;

  const repoResponse = await githubApiViaRelay('GET', repoPath, opts.token);
  assertOk(repoResponse);

  const baseRefResponse = await githubGetWithRetry(
    repoPath + '/git/ref/heads/' + encodeURIComponent(opts.baseBranch),
    opts.token,
  );
  assertOk(baseRefResponse);
  const baseSha = readNestedStringField(baseRefResponse.body, 'object', 'sha');

  const baseCommitResponse = await githubGetWithRetry(
    repoPath + '/git/commits/' + baseSha,
    opts.token,
  );
  assertOk(baseCommitResponse);
  const treeSha = readNestedStringField(baseCommitResponse.body, 'tree', 'sha');

  const headBranch = await createHeadBranchWithCollision(
    repoPath,
    opts.token,
    baseSha,
    opts.headBranch,
  );

  const blobShas: string[] = [];
  for (let i = 0; i < opts.files.length; i++) {
    const file = opts.files[i];
    const blobResponse = await githubApiViaRelay('POST', repoPath + '/git/blobs', opts.token, {
      content: file.content,
      encoding: 'utf-8',
    });
    assertOk(blobResponse);
    blobShas.push(readStringField(blobResponse.body, 'sha'));
  }

  const treeEntries = opts.files.map(function (file, index) {
    return {
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobShas[index],
    };
  });

  const treeResponse = await githubApiViaRelay('POST', repoPath + '/git/trees', opts.token, {
    base_tree: treeSha,
    tree: treeEntries,
  });
  assertOk(treeResponse);
  const newTreeSha = readStringField(treeResponse.body, 'sha');

  const commitResponse = await githubApiViaRelay('POST', repoPath + '/git/commits', opts.token, {
    message: opts.commitMessage,
    tree: newTreeSha,
    parents: [baseSha],
  });
  assertOk(commitResponse);
  const commitSha = readStringField(commitResponse.body, 'sha');

  const updateRefResponse = await githubApiViaRelay(
    'PATCH',
    repoPath + '/git/refs/heads/' + encodeURIComponent(headBranch),
    opts.token,
    { sha: commitSha },
  );
  assertOk(updateRefResponse, { branch: headBranch });

  const pullResponse = await githubApiViaRelay('POST', repoPath + '/pulls', opts.token, {
    title: opts.prTitle,
    head: headBranch,
    base: opts.baseBranch,
    body: opts.prBody,
  });
  assertOk(pullResponse);

  return {
    prUrl: readStringField(pullResponse.body, 'html_url'),
    prNumber: readNumberField(pullResponse.body, 'number'),
    headBranch: headBranch,
  };
}
