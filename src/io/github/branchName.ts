export const DEFAULT_BRANCH_PATTERN = 'figmint/{contractKind}-{date}';

export const MAX_BRANCH_ATTEMPTS = 5;

export function formatBranchPattern(
  pattern: string,
  contractKind: string,
  dateUtc: string,
): string {
  return pattern
    .replace(/\{contractKind\}/g, contractKind)
    .replace(/\{date\}/g, dateUtc);
}

export function withCollisionSuffix(branch: string, attempt: number): string {
  if (attempt === 0) {
    return branch;
  }
  return branch + '-' + String(attempt + 1);
}

export function buildDefaultHeadBranch(contractKind: string, dateUtc: Date): string {
  const year = dateUtc.getUTCFullYear();
  const month = String(dateUtc.getUTCMonth() + 1);
  const day = String(dateUtc.getUTCDate());
  const monthPadded = month.length === 1 ? '0' + month : month;
  const dayPadded = day.length === 1 ? '0' + day : day;
  const dateStr = String(year) + '-' + monthPadded + '-' + dayPadded;
  return formatBranchPattern(DEFAULT_BRANCH_PATTERN, contractKind, dateStr);
}
