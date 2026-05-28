import { describe, expect, it, vi } from 'vitest';

import { loadRegistryForComponentsTab } from '@/ui/components/scaffold/loadRegistryFromRepo';
import * as registryExport from '@/ui/components/registryExport';

import registryFixture from '../../../fixtures/io/sources/registry.json';

describe('loadRegistryForComponentsTab', () => {
  it('returns registry on success', async () => {
    vi.spyOn(registryExport, 'loadRegistryFromGitHub').mockResolvedValue(
      registryFixture as import('@detroitlabs/figmint-contracts').RegistryV1,
    );
    const result = await loadRegistryForComponentsTab(
      'https://github.com/acme/design-system',
      '.figmint-registry.json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.registry?.kind).toBe('registry');
    }
  });

  it('returns null registry with message on 404', async () => {
    vi.spyOn(registryExport, 'loadRegistryFromGitHub').mockResolvedValue(null);
    const result = await loadRegistryForComponentsTab(
      'https://github.com/acme/design-system',
      '.figmint-registry.json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.registry).toBeNull();
      expect(result.message).toContain('No sync registry');
    }
  });
});
