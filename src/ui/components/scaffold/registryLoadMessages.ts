export function emptyCanvasRegistryMessage(): string {
  return (
    'No linked components in canvas snapshot yet. Paste a spec below for your first scaffold.'
  );
}

export function syncRegistryLoadedMessage(keyCount: number): string {
  if (keyCount === 0) {
    return 'Canvas snapshot loaded but has no linked components yet.';
  }
  return String(keyCount) + ' linked component' + (keyCount === 1 ? '' : 's') + ' in canvas snapshot.';
}
