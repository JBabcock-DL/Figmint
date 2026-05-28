import { useEffect, useState } from 'react';

import { registerSinkMessageListener } from '@/io/sinks';
import { ExportSheet } from '@/ui/components/ExportSheet';
import { registerExportMessageListener } from '@/ui/export/exportMessageListener';
import { sampleDriftReportDocument } from '@/ui/export/sampleDriftReport';
import { Bootstrap } from '@/ui/tabs/Bootstrap';
import { Settings } from '@/ui/tabs/Settings';

type AppTab = 'bootstrap' | 'settings' | 'export';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('bootstrap');
  const [showExportSheet, setShowExportSheet] = useState(false);

  useEffect(function () {
    registerSinkMessageListener();
    registerExportMessageListener();
  }, []);

  return (
    <main
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        gap: '12px',
        height: '100vh',
        margin: 0,
        padding: '16px',
      }}
    >
      <header>
        <h1 style={{ fontSize: '18px', margin: '0 0 4px' }}>Figmint</h1>
        <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
          v{import.meta.env.PACKAGE_VERSION}
        </p>
      </header>

      <nav
        aria-label="Figmint tabs"
        style={{ borderBottom: '1px solid #ddd', paddingBottom: '6px' }}
      >
        <button
          type="button"
          aria-current={activeTab === 'bootstrap' ? 'page' : undefined}
          onClick={function () {
            setActiveTab('bootstrap');
          }}
          style={{
            background: activeTab === 'bootstrap' ? '#f0f0f0' : 'transparent',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
          }}
        >
          Bootstrap
        </button>
        <button
          type="button"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          onClick={function () {
            setActiveTab('settings');
          }}
          style={{
            background: activeTab === 'settings' ? '#f0f0f0' : 'transparent',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: '6px',
            padding: '4px 10px',
          }}
        >
          Settings
        </button>
        <button
          type="button"
          aria-current={activeTab === 'export' ? 'page' : undefined}
          onClick={function () {
            setActiveTab('export');
          }}
          style={{
            background: activeTab === 'export' ? '#f0f0f0' : 'transparent',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: '6px',
            padding: '4px 10px',
          }}
        >
          Export
        </button>
      </nav>

      {activeTab === 'export' ? (
        <section aria-label="Export sandbox" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ color: '#666', fontSize: 11, margin: 0 }}>
            Try the unified export sheet with a sample drift report fixture.
          </p>
          {!showExportSheet ? (
            <button
              type="button"
              onClick={function () {
                setShowExportSheet(true);
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
          ) : (
            <ExportSheet
              document={sampleDriftReportDocument}
              defaultSinks={['download']}
              onCancel={function () {
                setShowExportSheet(false);
              }}
            />
          )}
        </section>
      ) : activeTab === 'settings' ? (
        <Settings />
      ) : (
        <Bootstrap />
      )}
    </main>
  );
}
