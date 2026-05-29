import { useState } from 'react';

import { ExportSheet } from '@/ui/components/ExportSheet';
import { requestDriftReport } from '@/ui/drift/loadDriftReport';
import { prepareDriftExport } from '@/ui/drift/prepareDriftExport';
import { prepareRegistryExport } from '@/ui/export/registryExportSandbox';
import { sampleDriftReportDocument } from '@/ui/export/sampleDriftReport';
import { sampleRegistryDocument } from '@/ui/export/sampleRegistry';

import tokensFixture from '../../../tests/fixtures/ui/export/tokens.json';
import componentSpecFixture from '../../../tests/fixtures/ui/export/component-spec.json';
import type { ComponentSpecV1, TokensV1 } from '@detroitlabs/fighub-contracts';

export type ExportDemo = 'drift-report' | 'live-drift' | 'registry' | null;

export interface ExportSandboxProps {
  exportDemo: ExportDemo;
  onExportDemoChange: (demo: ExportDemo) => void;
}

export function ExportSandbox({ exportDemo, onExportDemoChange }: ExportSandboxProps) {
  const [liveDriftProps, setLiveDriftProps] = useState<ReturnType<
    typeof prepareDriftExport
  > | null>(null);
  const [liveError, setLiveError] = useState('');

  return (
    <>
      <p style={{ color: '#666', fontSize: 11, margin: 0 }}>
        Try the unified export sheet with sample drift report or registry fixtures.
      </p>
      {exportDemo === null ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={function () {
              onExportDemoChange('drift-report');
            }}
            style={{
              alignSelf: 'flex-start',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
            }}
          >
            Export sample drift report
          </button>
          <button
            type="button"
            onClick={function () {
              setLiveError('');
              void requestDriftReport({
                repoUrl: 'https://github.com/detroitlabs/fighub',
                repoTokens: tokensFixture as TokensV1,
                repoSpecs: [
                  {
                    name: 'Button',
                    spec: componentSpecFixture as ComponentSpecV1,
                  },
                ],
              })
                .then(function (report) {
                  setLiveDriftProps(prepareDriftExport(report));
                  onExportDemoChange('live-drift');
                })
                .catch(function (error: unknown) {
                  setLiveError(error instanceof Error ? error.message : String(error));
                });
            }}
            style={{
              alignSelf: 'flex-start',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
            }}
          >
            Build live drift report (mock)
          </button>
          <button
            type="button"
            onClick={function () {
              onExportDemoChange('registry');
            }}
            style={{
              alignSelf: 'flex-start',
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
            }}
          >
            Export sample registry
          </button>
        </div>
      ) : exportDemo === 'registry' ? (
        <ExportSheet
          {...prepareRegistryExport(sampleRegistryDocument)}
          onCancel={function () {
            onExportDemoChange(null);
          }}
        />
      ) : exportDemo === 'live-drift' && liveDriftProps !== null ? (
        <ExportSheet
          {...liveDriftProps}
          onCancel={function () {
            onExportDemoChange(null);
            setLiveDriftProps(null);
          }}
        />
      ) : (
        <ExportSheet
          document={sampleDriftReportDocument}
          defaultSinks={['download']}
          onCancel={function () {
            onExportDemoChange(null);
          }}
        />
      )}
      {liveError ? (
        <p role="alert" style={{ color: '#8a1f1f', fontSize: 11, margin: '8px 0 0' }}>
          {liveError}
        </p>
      ) : null}
    </>
  );
}
