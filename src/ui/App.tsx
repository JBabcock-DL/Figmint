import { Bootstrap } from '@/ui/tabs/Bootstrap';

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

      <nav
        aria-label="Figmint tabs"
        style={{ borderBottom: '1px solid #ddd', paddingBottom: '6px' }}
      >
        <button
          type="button"
          aria-current="page"
          style={{
            background: '#f0f0f0',
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
          disabled
          style={{
            fontSize: '11px',
            marginLeft: '6px',
            opacity: 0.45,
            padding: '4px 10px',
          }}
        >
          Sync (soon)
        </button>
      </nav>

      <Bootstrap />
    </main>
  );
}
