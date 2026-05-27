import { flags } from '@/config/flags';

export function App() {
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
          v{import.meta.env.PACKAGE_VERSION} · {flags.buildTarget} build
        </p>
      </header>
      <p style={{ color: '#333', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
        Sprint 1 scaffold. The bootstrap tab, components tab, sync tab, and handoff tab arrive in
        upcoming sprints — see <code>Docs/PRD.md</code> for the phasing.
      </p>
    </main>
  );
}
