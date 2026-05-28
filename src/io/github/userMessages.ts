/** Designer-facing copy for GitHub PR sink failures (research §6). */

export const GITHUB_PR_EMPTY_REPO = {
  message: 'This repository has no commits yet; cannot open a PR.',
  hint: 'Push an initial commit to the repo first.',
} as const;

export const GITHUB_PR_BRANCH_EXISTS_HINT =
  'Change branch pattern or delete the remote branch.';

export function formatBranchExistsMessage(branch: string): string {
  return 'A branch named `' + branch + '` already exists.';
}
