import type { RegistryV1 } from '@detroitlabs/figmint-contracts';

import { loadRegistryFromGitHub } from '@/ui/components/registryExport';
import {
  emptySyncRegistryMessage,
  isLikelyRegistrySchemaPath,
  syncRegistryLoadedMessage,
} from '@/ui/components/scaffold/registryLoadMessages';

export async function loadRegistryForComponentsTab(
  repoUrl: string,
  registryPath: string,
): Promise<
  { ok: true; registry: RegistryV1 | null; message?: string } | { ok: false; message: string }
> {
  if (isLikelyRegistrySchemaPath(registryPath)) {
    return {
      ok: false,
      message: emptySyncRegistryMessage(registryPath),
    };
  }

  const loaded = await loadRegistryFromGitHub(repoUrl, registryPath);

  if (loaded === null) {
    return {
      ok: true,
      registry: null,
      message: emptySyncRegistryMessage(registryPath),
    };
  }

  if ('error' in loaded) {
    const hint = isLikelyRegistrySchemaPath(registryPath)
      ? emptySyncRegistryMessage(registryPath)
      : loaded.error;
    return { ok: false, message: hint };
  }

  const keys = Object.keys(loaded.components);
  return {
    ok: true,
    registry: loaded,
    message: syncRegistryLoadedMessage(keys.length),
  };
}
