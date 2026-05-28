import { DEFAULT_REGISTRY_PATH } from '@/ui/components/scaffold/constants';

export function isLikelyRegistrySchemaPath(path: string): boolean {
  const normalized = path.trim().toLowerCase();
  return normalized.endsWith('.schema.json') || normalized.includes('/dist/') && normalized.includes('registry');
}

export function emptySyncRegistryMessage(registryPath: string): string {
  if (isLikelyRegistrySchemaPath(registryPath)) {
    return (
      'That path looks like a JSON Schema contract file, not a sync registry instance. ' +
      'In Settings, set Figma sync file path to ' +
      DEFAULT_REGISTRY_PATH +
      ' (or your repo\'s registry document with kind: "registry").'
    );
  }
  return (
    'No sync registry at ' +
    registryPath +
    ' yet. This file lists components already linked in Figma — not every component in your repo. ' +
    'Paste a spec below for your first scaffold, then export the sync file from Settings path ' +
    DEFAULT_REGISTRY_PATH +
    '.'
  );
}

export function syncRegistryLoadedMessage(keyCount: number): string {
  if (keyCount === 0) {
    return 'Sync file loaded but has no linked components yet.';
  }
  return String(keyCount) + ' linked component' + (keyCount === 1 ? '' : 's') + ' in sync file.';
}
