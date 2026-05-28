import type { RegistryV1 } from '@detroitlabs/figmint-contracts';
import { describe, expect, it, vi } from 'vitest';

import * as flagsModule from '@/config/flags';
import {
  createRegistryExportSheetInitialState,
  defaultRegistryExportSinks,
  loadRegistryFromGitHub,
  prepareRegistryExport,
} from '@/ui/components/registryExport';
import * as githubSources from '@/io/sources/github';

import registryFixture from '../../../fixtures/io/sources/registry.json';

const registryPayload = registryFixture as RegistryV1;

describe('registryExport', () => {
  it('defaultRegistryExportSinks returns download + github-pr when GitHub connected', () => {
    vi.spyOn(flagsModule, 'flags', 'get').mockReturnValue({
      githubOAuth: true,
      githubPRSink: true,
      componentImport: true,
      codeConnectPR: true,
      evcProjector: true,
    });
    expect(defaultRegistryExportSinks(true)).toEqual(['download', 'github-pr']);
  });

  it('defaultRegistryExportSinks returns download only when GitHub disconnected', () => {
    vi.spyOn(flagsModule, 'flags', 'get').mockReturnValue({
      githubOAuth: true,
      githubPRSink: true,
      componentImport: true,
      codeConnectPR: true,
      evcProjector: true,
    });
    expect(defaultRegistryExportSinks(false)).toEqual(['download']);
  });

  it('prepareRegistryExport builds registry ContractDocument with Update registry title', () => {
    const props = prepareRegistryExport(registryPayload, {
      defaultSinks: defaultRegistryExportSinks(true),
    });
    expect(props.document.kind).toBe('registry');
    expect(props.title).toBe('Update registry');
    expect(props.defaultSinks).toEqual(['download', 'github-pr']);
  });

  it('prepareRegistryExport initializes ExportSheet with json-only registry path', () => {
    const props = prepareRegistryExport(registryPayload);
    const state = createRegistryExportSheetInitialState(registryPayload);
    expect(state.formats).toEqual({ json: true, md: false });
    expect(state.path).toBe('.figmint-registry');
    expect(props.document.payload).toEqual(registryPayload);
  });

  it('loadRegistryFromGitHub returns null on 404', async () => {
    vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'unsupported-type',
      message: 'GitHub API 404 Not Found',
      location: { source: 'paste' },
    });

    const result = await loadRegistryFromGitHub('https://github.com/acme/design-system');
    expect(result).toBeNull();
  });

  it('loadRegistryFromGitHub returns RegistryV1 on success', async () => {
    vi.spyOn(githubSources, 'loadFromGitHub').mockResolvedValue({
      kind: 'registry',
      payload: registryPayload,
      sourceMeta: {
        port: 'github',
        repoUrl: 'https://github.com/acme/design-system',
        path: '.figmint-registry.json',
        receivedAt: '2026-05-28T00:00:00.000Z',
      },
      rawSnippet: '',
    });

    const result = await loadRegistryFromGitHub('https://github.com/acme/design-system');
    expect(result).toEqual(registryPayload);
  });
});

// SPK-026-5: OAuth PR end-to-end deferred — requires live GitHub relay + Figma desktop VQA.
describe.skip('SPK-026-5 registry GitHub PR export', () => {
  it('opens PR with .figmint-registry.json via ExportSheet', () => {
    expect(true).toBe(true);
  });
});
