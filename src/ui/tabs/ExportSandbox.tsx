import { ExportSheet } from '@/ui/components/ExportSheet';
import { prepareRegistryExport } from '@/ui/export/registryExportSandbox';
import { sampleDriftReportDocument } from '@/ui/export/sampleDriftReport';
import { sampleRegistryDocument } from '@/ui/export/sampleRegistry';

export type ExportDemo = 'drift-report' | 'registry' | null;

export interface ExportSandboxProps {
  exportDemo: ExportDemo;
  onExportDemoChange: (demo: ExportDemo) => void;
}

export function ExportSandbox({ exportDemo, onExportDemoChange }: ExportSandboxProps) {
  return (
    <>
      <p style={{ color: '#666', fontSize: 11, margin: 0 }}>
        Try the unified export sheet with sample drift report or registry fixtures.
      </p>
      {exportDemo === null ? (
        <div style={{ display: 'flex', gap: 8 }}>
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
      ) : (
        <ExportSheet
          document={sampleDriftReportDocument}
          defaultSinks={['download']}
          onCancel={function () {
            onExportDemoChange(null);
          }}
        />
      )}
    </>
  );
}
