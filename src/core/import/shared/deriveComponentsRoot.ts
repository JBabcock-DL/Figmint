/** Default file-list root for import/list-files (parent of specsPath or components/). */
export function deriveComponentsRoot(specsPath: string | undefined): string {
  if (specsPath === undefined || specsPath.length === 0) {
    return 'components/';
  }
  let normalized = specsPath.replace(/\\/g, '/');
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash >= 0) {
    return normalized.slice(0, lastSlash + 1);
  }
  return 'components/';
}
