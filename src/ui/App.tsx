import { useEffect, useState } from 'react';

import { registerSinkMessageListener } from '@/io/sinks';
import { TabPanel } from '@/ui/components/TabPanel';
import { registerExportMessageListener } from '@/ui/export/exportMessageListener';
import { useGitHubConnect } from '@/ui/github/useGitHubConnect';
import { useGitHubSession } from '@/ui/github/useGitHubSession';
import { Bootstrap } from '@/ui/tabs/Bootstrap';
import { Components } from '@/ui/tabs/Components';
import { ExportSandbox, type ExportDemo } from '@/ui/tabs/ExportSandbox';
import { Settings } from '@/ui/tabs/Settings';

type AppTab = 'bootstrap' | 'components' | 'export' | 'settings';

const TAB_PANEL_IDS: Record<AppTab, string> = {
  bootstrap: 'fighub-tabpanel-bootstrap',
  components: 'fighub-tabpanel-components',
  export: 'fighub-tabpanel-export',
  settings: 'fighub-tabpanel-settings',
};

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('bootstrap');
  const [exportDemo, setExportDemo] = useState<ExportDemo>(null);
  const githubSession = useGitHubSession();
  const github = useGitHubConnect({
    repoUrl: githubSession.repoUrl,
  });

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
        <h1 style={{ fontSize: '18px', margin: '0 0 4px' }}>FigHub</h1>
        <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
          v{import.meta.env.PACKAGE_VERSION}
        </p>
      </header>

      <nav
        aria-label="FigHub tabs"
        role="tablist"
        style={{ borderBottom: '1px solid #ddd', paddingBottom: '6px' }}
      >
        <button
          type="button"
          role="tab"
          id="fighub-tab-bootstrap"
          aria-controls={TAB_PANEL_IDS.bootstrap}
          aria-selected={activeTab === 'bootstrap'}
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
          role="tab"
          id="fighub-tab-components"
          aria-controls={TAB_PANEL_IDS.components}
          aria-selected={activeTab === 'components'}
          aria-current={activeTab === 'components' ? 'page' : undefined}
          onClick={function () {
            setActiveTab('components');
          }}
          style={{
            background: activeTab === 'components' ? '#f0f0f0' : 'transparent',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: '6px',
            padding: '4px 10px',
          }}
        >
          Components
        </button>
        <button
          type="button"
          role="tab"
          id="fighub-tab-export"
          aria-controls={TAB_PANEL_IDS.export}
          aria-selected={activeTab === 'export'}
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
        <button
          type="button"
          role="tab"
          id="fighub-tab-settings"
          aria-controls={TAB_PANEL_IDS.settings}
          aria-selected={activeTab === 'settings'}
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
      </nav>

      {/* All panels stay mounted — switching tabs only toggles visibility. */}
      <TabPanel id={TAB_PANEL_IDS.bootstrap} active={activeTab === 'bootstrap'}>
        <Bootstrap />
      </TabPanel>

      <TabPanel id={TAB_PANEL_IDS.components} active={activeTab === 'components'}>
        <Components
          repoUrl={githubSession.repoUrl}
          github={github}
          specsPath={
            githubSession.resolvedConfig !== null
              ? githubSession.resolvedConfig.specsPath
              : undefined
          }
          onOpenSettings={function () {
            setActiveTab('settings');
          }}
        />
      </TabPanel>

      <TabPanel id={TAB_PANEL_IDS.export} active={activeTab === 'export'}>
        <ExportSandbox exportDemo={exportDemo} onExportDemoChange={setExportDemo} />
      </TabPanel>

      <TabPanel id={TAB_PANEL_IDS.settings} active={activeTab === 'settings'}>
        <Settings
          repoUrl={githubSession.repoUrl}
          onRepoUrlChange={githubSession.setRepoUrl}
          github={github}
          sessionResolvedConfig={githubSession.resolvedConfig}
          sessionLastFetchedAt={githubSession.lastFetchedAt}
          sessionLastPulledAt={githubSession.lastPulledAt}
          sessionLastPushedAt={githubSession.lastPushedAt}
          sessionConfigWarning={githubSession.configWarning}
        />
      </TabPanel>
    </main>
  );
}
