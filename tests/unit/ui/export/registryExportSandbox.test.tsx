import type { RegistryV1 } from '@detroitlabs/figmint-contracts';
import { describe, expect, it, vi } from 'vitest';

import * as flagsModule from '@/config/flags';
import {
  createRegistryExportSheetInitialState,
  defaultRegistryExportSinks,
  prepareRegistryExport,
} from '@/ui/export/registryExportSandbox';

import registryFixture from '../../../fixtures/io/sources/registry.json';

const registryPayload = registryFixture as RegistryV1;

describe('registryExportSandbox', () => {
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
    expect(state.path).toBe('docs/figmint/registry-export');
    expect(props.document.payload).toEqual(registryPayload);
  });
});
