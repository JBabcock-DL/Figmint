/** Mirrors `normalizeVariablePath` in scaffold selector — avoids circular imports. */
export function normalizeResolverVariablePath(raw: string): string {
  const trimmed = raw.trim();
  const collectionMatch = /^(Primitives|Theme|Typography|Layout|Effects)\/(.+)$/.exec(trimmed);
  if (collectionMatch !== null) {
    return collectionMatch[2];
  }
  return trimmed;
}
