import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { CatalogEntryRow } from '@/ui/components/catalog/CatalogEntryRow';
import { useCatalogBatchScaffold } from '@/ui/components/catalog/useCatalogBatchScaffold';
import { useCatalogDiscovery } from '@/ui/components/catalog/useCatalogDiscovery';

const MAX_BATCH_SIZE = 20;

export interface CatalogPanelProps {
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  githubConnected: boolean;
  onOpenSettings?: () => void;
  onBatchComplete?: (registry: RegistryV1) => void;
  /** WO-044 increments after successful import-from-repo to refresh catalog list. */
  refreshToken?: number;
}

function filterEntries(
  entries: ReturnType<typeof useCatalogDiscovery>['entries'],
  query: string,
): ReturnType<typeof useCatalogDiscovery>['entries'] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return entries;
  }
  return entries.filter(function (entry) {
    return (
      entry.key.toLowerCase().includes(trimmed) ||
      entry.displayName.toLowerCase().includes(trimmed) ||
      entry.path.toLowerCase().includes(trimmed)
    );
  });
}

export function CatalogPanel({
  repoUrl,
  specsPath,
  designSystemBranch,
  githubConnected,
  onOpenSettings,
  onBatchComplete,
  refreshToken,
}: CatalogPanelProps) {
  const discovery = useCatalogDiscovery({
    repoUrl: repoUrl,
    specsPath: specsPath,
    designSystemBranch: designSystemBranch,
    enabled: githubConnected,
  });
  const batch = useCatalogBatchScaffold();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(
    function () {
      if (refreshToken === undefined) {
        return;
      }
      if (githubConnected) {
        discovery.refresh();
      }
    },
    [refreshToken, githubConnected, discovery.refresh],
  );

  useEffect(
    function () {
      if (!batch.state.running && batch.state.registry !== null && onBatchComplete !== undefined) {
        onBatchComplete(batch.state.registry);
      }
    },
    [batch.state.running, batch.state.registry, onBatchComplete],
  );

  const filteredEntries = useMemo(
    function () {
      return filterEntries(discovery.entries, searchQuery);
    },
    [discovery.entries, searchQuery],
  );

  const selectedCount = selectedPaths.size;
  const overBatchLimit = selectedCount > MAX_BATCH_SIZE;
  const batchComplete = !batch.state.running && batch.state.total > 0 && batch.state.registry !== null;
  const checklistDisabled = !githubConnected || discovery.loading || batch.state.running;

  function togglePath(path: string, checked: boolean) {
    setSelectedPaths(function (prev) {
      const next = new Set(prev);
      if (checked) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedPaths(new Set());
      return;
    }
    const next = new Set<string>();
    for (let i = 0; i < filteredEntries.length; i++) {
      next.add(filteredEntries[i].path);
    }
    setSelectedPaths(next);
  }

  const allFilteredSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every(function (entry) {
      return selectedPaths.has(entry.path);
    });

  const panelStyle: CSSProperties = {
    opacity: githubConnected ? 1 : 0.6,
    pointerEvents: githubConnected ? 'auto' : 'none',
  };

  return (
    <div style={panelStyle}>
      <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
        Scans your GitHub repo for component-spec files — not the canvas sync registry below.
      </p>

      {!githubConnected ? (
        <>
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 8px' }}>
            Connect GitHub in Settings to browse repo components.
          </p>
          {onOpenSettings !== undefined ? (
            <button
              type="button"
              onClick={onOpenSettings}
              style={{
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
              }}
            >
              Open Settings
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={discovery.refresh}
              disabled={discovery.loading || batch.state.running}
              style={{
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 10,
                padding: '4px 8px',
              }}
            >
              Refresh
            </button>
            {discovery.truncated ? (
              <span style={{ color: '#996600', fontSize: 10, lineHeight: 1.6 }}>
                Large repo — list may be incomplete.
              </span>
            ) : null}
          </div>

          {discovery.loading ? (
            <p role="status" aria-busy="true" style={{ color: '#666', fontSize: 11, margin: 0 }}>
              Discovering components…
            </p>
          ) : null}

          {discovery.error.length > 0 ? (
            <p style={{ color: '#b00020', fontSize: 11, margin: '0 0 8px' }}>{discovery.error}</p>
          ) : null}

          {!discovery.loading && discovery.entries.length === 0 && discovery.error.length === 0 ? (
            <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: 0 }}>
              No specs found. Try Import from repo or paste JSON. The sync registry below only
              lists components already linked on the canvas.
            </p>
          ) : null}

          {discovery.entries.length > 0 ? (
            <>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
                <span style={{ display: 'block', marginBottom: 4 }}>Filter components</span>
                <input
                  type="search"
                  value={searchQuery}
                  aria-label="Filter components"
                  onChange={function (event) {
                    setSearchQuery(event.target.value);
                  }}
                  style={{
                    boxSizing: 'border-box',
                    fontSize: 11,
                    padding: '6px 8px',
                    width: '100%',
                  }}
                />
              </label>

              <label style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  disabled={checklistDisabled || filteredEntries.length === 0}
                  aria-label="Select all components"
                  onChange={function (event) {
                    toggleSelectAll(event.target.checked);
                  }}
                  style={{ marginRight: 6 }}
                />
                Select all ({String(filteredEntries.length)})
              </label>

              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {filteredEntries.map(function (entry) {
                  return (
                    <CatalogEntryRow
                      key={entry.path}
                      entry={entry}
                      checked={selectedPaths.has(entry.path)}
                      disabled={checklistDisabled}
                      onToggle={togglePath}
                    />
                  );
                })}
              </div>

              {overBatchLimit ? (
                <p style={{ color: '#996600', fontSize: 10, margin: '8px 0 0' }}>
                  Select at most {String(MAX_BATCH_SIZE)} components per batch.
                </p>
              ) : null}

              {selectedCount > 0 ? (
                <button
                  type="button"
                  disabled={checklistDisabled || overBatchLimit}
                  aria-disabled={checklistDisabled || overBatchLimit || selectedCount === 0}
                  onClick={function () {
                    batch.runBatch(Array.from(selectedPaths), repoUrl);
                  }}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: checklistDisabled || overBatchLimit ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    marginTop: 8,
                    opacity: checklistDisabled || overBatchLimit ? 0.5 : 1,
                    padding: '6px 14px',
                  }}
                >
                  Scaffold selected ({String(selectedCount)})
                </button>
              ) : null}

              {batch.state.running ? (
                <p role="status" style={{ color: '#666', fontSize: 10, margin: '8px 0 0' }}>
                  {String(batch.state.currentIndex + 1)}/{String(batch.state.total)} —{' '}
                  {batch.state.currentLabel}…
                </p>
              ) : null}

              {batchComplete ? (
                <p role="status" style={{ color: '#333', fontSize: 10, margin: '8px 0 0' }}>
                  {String(batch.state.completed)} scaffolded, {String(batch.state.failed)} failed
                </p>
              ) : null}

              {batch.state.batchErrors.length > 0 && !batch.state.running ? (
                <ul
                  style={{
                    color: '#b00020',
                    fontSize: 10,
                    lineHeight: 1.45,
                    margin: '8px 0 0',
                    paddingLeft: 16,
                  }}
                >
                  {batch.state.batchErrors.map(function (item) {
                    return (
                      <li key={item.specPath + item.message}>
                        {item.specPath.length > 0 ? item.specPath + ': ' : ''}
                        {item.message}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
