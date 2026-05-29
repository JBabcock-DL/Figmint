import type { SinkFailureCode } from '@/io/sinks/types';

export interface MappedGitHubError {
  code: SinkFailureCode;
  message: string;
  hint?: string;
  clearToken?: boolean;
}

export interface MapGitHubHttpErrorContext {
  branch?: string;
  rateLimitRemaining?: number;
}

function readGitHubMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const message = (body as Record<string, unknown>).message;
  return typeof message === 'string' ? message : undefined;
}

export function mapNetworkError(_error: unknown): MappedGitHubError {
  return {
    code: 'network',
    message: 'Network error reaching GitHub.',
    hint: 'Check connection and try again.',
  };
}

export function mapGitHubHttpError(
  status: number,
  body: unknown,
  context: MapGitHubHttpErrorContext = {},
): MappedGitHubError {
  const ghMessage = readGitHubMessage(body);

  if (status === 401) {
    return {
      code: 'auth-expired',
      message: 'GitHub authorization expired.',
      hint: 'Reconnect GitHub in Settings.',
      clearToken: true,
    };
  }

  if (status === 403) {
    if (context.rateLimitRemaining === 0) {
      return {
        code: 'network',
        message: 'GitHub rate limit reached. Try again in a few minutes.',
        hint: 'Wait and retry.',
      };
    }
    return {
      code: 'forbidden',
      message: 'GitHub token cannot write to this repository.',
      hint: 'Re-authorize with repo scope.',
    };
  }

  if (status === 404) {
    return {
      code: 'not-found',
      message: 'Repository or base branch not found.',
      hint: 'Check connected repo URL and base branch.',
    };
  }

  if (status === 422) {
    const branch = context.branch ?? 'branch';
    return {
      code: 'branch-exists',
      message: 'A branch named `' + branch + '` already exists.',
      hint: 'Change branch pattern or delete the remote branch.',
    };
  }

  if (status === 409) {
    const normalized = (ghMessage ?? '').toLowerCase();
    if (normalized.includes('empty') || normalized.includes('no commits')) {
      return {
        code: 'conflict',
        message: 'This repository has no commits yet; cannot open a PR.',
        hint: 'Push an initial commit to the repo first.',
      };
    }
    return {
      code: 'conflict',
      message: 'GitHub rejected the commit (content changed on the branch).',
      hint: 'Retry export; plugin will use a new branch name.',
    };
  }

  if (status >= 500) {
    return {
      code: 'network',
      message: 'GitHub is temporarily unavailable.',
      hint: 'Retry once (single backoff); then fail.',
    };
  }

  return {
    code: 'network',
    message: ghMessage ?? 'GitHub request failed with HTTP ' + String(status),
    hint: 'Check connection and try again.',
  };
}

export class GitHubFlowError extends Error {
  readonly name = 'GitHubFlowError';
  readonly mapped: MappedGitHubError;
  readonly httpStatus: number;

  constructor(mapped: MappedGitHubError, httpStatus: number) {
    super(mapped.message);
    this.mapped = mapped;
    this.httpStatus = httpStatus;
  }
}

export function isReferenceAlreadyExists(body: unknown): boolean {
  const message = readGitHubMessage(body);
  if (message === undefined) {
    return false;
  }
  return message.toLowerCase().includes('already exists');
}
