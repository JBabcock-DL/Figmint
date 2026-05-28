/** Short display label for a GitHub repo URL (owner/repo). */
export function formatRepoDisplay(repoUrl: string): string {
  const trimmed = repoUrl.trim();
  if (trimmed.length === 0) {
    return 'Not configured';
  }
  const match = trimmed.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  if (match !== null) {
    return match[1] + '/' + match[2];
  }
  return trimmed;
}
