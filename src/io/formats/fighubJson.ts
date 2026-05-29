import type { FigHubJsonV1, ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

export const FIGHUB_JSON_FILENAME = 'fighub.json';

export const FIGHUB_JSON_DEFAULTS: Required<
  Pick<FigHubJsonV1, 'tokensPath' | 'specsPath' | 'exportBasePath'>
> & { designSystemBranch: string | null } = {
  tokensPath: 'design/tokens.json',
  specsPath: 'components/',
  exportBasePath: 'docs/fighub/',
  designSystemBranch: null,
};

export type ParseFigHubJsonResult =
  | { ok: true; value: FigHubJsonV1 }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseFigHubJson(text: string): ParseFigHubJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'fighub.json is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'fighub.json must be a JSON object.' };
  }

  if (parsed.v !== 1) {
    return { ok: false, error: 'fighub.json version must be 1.' };
  }

  if (parsed.kind !== undefined && parsed.kind !== 'fighub-config') {
    return { ok: false, error: 'fighub.json kind must be "fighub-config".' };
  }

  const value: FigHubJsonV1 = {
    v: 1,
    kind: 'fighub-config',
  };

  if (typeof parsed.tokensPath === 'string' && parsed.tokensPath.length > 0) {
    value.tokensPath = parsed.tokensPath;
  }
  if (typeof parsed.specsPath === 'string' && parsed.specsPath.length > 0) {
    value.specsPath = parsed.specsPath;
  }
  if (typeof parsed.designSystemBranch === 'string' && parsed.designSystemBranch.length > 0) {
    value.designSystemBranch = parsed.designSystemBranch;
  }
  if (typeof parsed.exportBasePath === 'string' && parsed.exportBasePath.length > 0) {
    value.exportBasePath = parsed.exportBasePath;
  }

  return { ok: true, value: value };
}

export function resolveFigHubConfig(
  parsed: FigHubJsonV1 | null,
  defaultBranch: string,
): ResolvedFigHubConfig {
  const branchFromFile =
    parsed?.designSystemBranch !== undefined &&
    parsed.designSystemBranch.length > 0
      ? parsed.designSystemBranch
      : defaultBranch;

  return {
    tokensPath:
      parsed?.tokensPath !== undefined && parsed.tokensPath.length > 0
        ? parsed.tokensPath
        : FIGHUB_JSON_DEFAULTS.tokensPath,
    specsPath:
      parsed?.specsPath !== undefined && parsed.specsPath.length > 0
        ? parsed.specsPath
        : FIGHUB_JSON_DEFAULTS.specsPath,
    exportBasePath:
      parsed?.exportBasePath !== undefined && parsed.exportBasePath.length > 0
        ? parsed.exportBasePath
        : FIGHUB_JSON_DEFAULTS.exportBasePath,
    designSystemBranch: branchFromFile,
  };
}
